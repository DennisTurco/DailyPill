using System.ComponentModel;
using System.Diagnostics;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using DailyPill.Common.DTOs;
using DailyPill.Common.Exceptions;
using DailyPill.Common.Interfaces;
using DailyPill.Infrastructure.Config;
using Microsoft.Extensions.Logging;

namespace DailyPill.Infrastructure.Services;

public class OllamaService : IOllamaService
{
    private const int OllamaAllGpuLayers = 999;
    private const int OllamaStartRetries = 60;
    private static readonly TimeSpan OllamaStartRetryDelay = TimeSpan.FromSeconds(1);

    private readonly HttpClient _http;
    private readonly ILogger<OllamaService> _logger;
    private readonly TimeSpan _generateTimeout;

    private readonly object _pullLock = new();
    private bool _pulling;
    private string? _pullModel;
    private string? _pullStatus;
    private double? _pullPercent;

    public string Model { get; }
    public string BaseUrl { get; }
    public bool GpuEnabled { get; }

    public OllamaService(IHttpClientFactory httpClientFactory, AppSettings settings, IGpuService gpuService, ILogger<OllamaService> logger)
    {
        _http = httpClientFactory.CreateClient("ollama");
        _logger = logger;
        BaseUrl = settings.OllamaBaseUrl.TrimEnd('/');
        Model = settings.OllamaModel;
        _generateTimeout = TimeSpan.FromSeconds(settings.OllamaTimeoutSeconds);
        GpuEnabled = gpuService.DetectNvidiaGpu();
    }

    private async Task<string> GenerateAsync(string prompt, string? system, bool jsonMode, List<string> contextDocuments, CancellationToken ct = default)
    {
        var payload = new Dictionary<string, object?>
        {
            ["model"] = Model,
            ["prompt"] = prompt,
            ["stream"] = false,
        };
        if (system is not null)
        {
            if (contextDocuments.Count > 0)
                system += $"\n\nCONTEXT DOCUMENT: {BuildContextDocuments(contextDocuments)}";
            payload["system"] = system;
        }
        if (jsonMode) payload["format"] = "json";
        if (GpuEnabled) payload["options"] = new Dictionary<string, object?> { ["num_gpu"] = OllamaAllGpuLayers };

        HttpResponseMessage response;
        try
        {
            using var cts = CancellationTokenSource.CreateLinkedTokenSource(ct);
            cts.CancelAfter(_generateTimeout);
            response = await _http.PostAsJsonAsync($"{BaseUrl}/api/generate", payload, cts.Token);
        }
        catch (Exception exc) when (exc is HttpRequestException or TaskCanceledException)
        {
            throw new OllamaUnavailableException($"Could not reach Ollama at {BaseUrl}: {exc.Message}");
        }

        if (response.StatusCode == System.Net.HttpStatusCode.NotFound)
        {
            throw new OllamaUnavailableException(
                $"Model '{Model}' is not available in Ollama at {BaseUrl}. Pull it first with: ollama pull {Model}");
        }
        if (!response.IsSuccessStatusCode)
        {
            throw new OllamaUnavailableException($"Could not reach Ollama at {BaseUrl}: HTTP {(int)response.StatusCode}");
        }

        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        return json.TryGetProperty("response", out var resp) ? resp.GetString() ?? "" : "";
    }

    public bool IsAvailable()
    {
        try
        {
            using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(5));
            var response = _http.GetAsync($"{BaseUrl}/api/tags", cts.Token).GetAwaiter().GetResult();
            return response.StatusCode == System.Net.HttpStatusCode.OK;
        }
        catch
        {
            return false;
        }
    }

    public bool? HasModel()
    {
        JsonElement root;
        try
        {
            using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(5));
            var response = _http.GetAsync($"{BaseUrl}/api/tags", cts.Token).GetAwaiter().GetResult();
            if (!response.IsSuccessStatusCode) return null;
            root = response.Content.ReadFromJsonAsync<JsonElement>(cts.Token).GetAwaiter().GetResult();
        }
        catch
        {
            return null;
        }

        if (!root.TryGetProperty("models", out var models) || models.ValueKind != JsonValueKind.Array)
        {
            return false;
        }

        foreach (var m in models.EnumerateArray())
        {
            var name = m.TryGetProperty("name", out var n) ? n.GetString() ?? "" : "";
            if (name == Model || name.Split(':')[0] == Model)
            {
                return true;
            }
        }
        return false;
    }

    public PullState GetPullState()
    {
        lock (_pullLock)
        {
            return new PullState(_pulling, _pullModel, _pullStatus, _pullPercent);
        }
    }

    private void SetPullState(bool? pulling = null, string? model = null, string? status = null, double? percent = null, bool percentSet = false)
    {
        lock (_pullLock)
        {
            if (pulling.HasValue) _pulling = pulling.Value;
            if (model is not null) _pullModel = model;
            if (status is not null) _pullStatus = status;
            if (percentSet) _pullPercent = percent;
        }
    }

    public void Bootstrap()
    {
        _ = Task.Run(BootstrapAsync);
    }

    private async Task BootstrapAsync()
    {
        try
        {
            if (!IsAvailable())
            {
                StartOllama();
                for (var i = 0; i < OllamaStartRetries; i++)
                {
                    await Task.Delay(OllamaStartRetryDelay);
                    if (IsAvailable()) break;
                }
            }
            await EnsureModelPulledAsync();
        }
        catch (Exception exc)
        {
            _logger.LogWarning(exc, "Ollama bootstrap failed unexpectedly");
        }
    }

    private void StartOllama()
    {
        try
        {
            var startInfo = new ProcessStartInfo
            {
                FileName = "ollama",
                Arguments = "serve",
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                UseShellExecute = false,
                CreateNoWindow = true,
            };
            Process.Start(startInfo);
            _logger.LogInformation("Launched 'ollama serve' since Ollama was not reachable at {BaseUrl}", BaseUrl);
        }
        catch (Win32Exception)
        {
            _logger.LogWarning(
                "Ollama is not reachable at {BaseUrl} and the 'ollama' executable was not found on PATH; install Ollama or start it manually.",
                BaseUrl);
        }
        catch (Exception exc)
        {
            _logger.LogWarning(exc, "Could not launch Ollama automatically");
        }
    }

    private async Task EnsureModelPulledAsync()
    {
        if (HasModel() != false) return;

        lock (_pullLock)
        {
            if (_pulling) return;
            _pulling = true;
            _pullModel = Model;
            _pullStatus = "starting";
            _pullPercent = null;
        }

        _ = Task.Run(PullModelAsync);
    }

    private async Task PullModelAsync()
    {
        try
        {
            var body = JsonSerializer.Serialize(new { name = Model, stream = true });
            using var request = new HttpRequestMessage(HttpMethod.Post, $"{BaseUrl}/api/pull")
            {
                Content = new StringContent(body, Encoding.UTF8, "application/json"),
            };
            using var response = await _http.SendAsync(request, HttpCompletionOption.ResponseHeadersRead);
            response.EnsureSuccessStatusCode();

            await using var stream = await response.Content.ReadAsStreamAsync();
            using var reader = new StreamReader(stream);
            while (!reader.EndOfStream)
            {
                var line = await reader.ReadLineAsync();
                if (string.IsNullOrWhiteSpace(line)) continue;

                JsonElement data;
                try
                {
                    data = JsonSerializer.Deserialize<JsonElement>(line);
                }
                catch (JsonException)
                {
                    continue;
                }

                double? total = data.TryGetProperty("total", out var t) && t.ValueKind == JsonValueKind.Number ? t.GetDouble() : null;
                double? completed = data.TryGetProperty("completed", out var c) && c.ValueKind == JsonValueKind.Number ? c.GetDouble() : null;
                double? percent = total is > 0 && completed.HasValue ? Math.Round(completed.Value / total.Value * 100, 1) : null;
                var status = data.TryGetProperty("status", out var s) ? s.GetString() : null;

                SetPullState(status: status, percentSet: true, percent: percent);
            }
        }
        catch (Exception exc)
        {
            SetPullState(status: $"error: {exc.Message}");
        }
        finally
        {
            SetPullState(pulling: false);
        }
    }

    public async Task<List<JsonElement>> GenerateQuestionsAsync(string topicName, string prompt, int count, int? difficulty, List<string> contextDocuments)
    {
        var difficultyHint = difficulty is > 0
            ? $"target difficulty {difficulty} (1=easiest, 5=hardest)"
            : "mixed difficulty 1-5";
        const string system =
            "You are a quiz question generator. Respond ONLY with valid JSON: " +
            "{\"questions\": [{\"type\": \"multiple_choice|completion|single_word|open_answer\", " +
            "\"text\": str, \"options\": [str] or null, \"correct_answer\": str, " +
            "\"difficulty\": int 1-5, \"explanation\": str or null}]}. " +
            "correct_answer is REQUIRED and must be a non-empty string for every question, with no exceptions. " +
            "For multiple_choice, options must contain 4 items and correct_answer must equal one of them exactly. " +
            "For open_answer, correct_answer must contain a concise reference/model answer (a few sentences) " +
            "even though explanation may repeat or expand on it.";

        var userPrompt = $"Topic: {topicName}\nInstructions: {prompt}\nGenerate exactly {count} questions, {difficultyHint}.";

        var raw = await GenerateAsync(userPrompt, system, jsonMode: true, contextDocuments);
        return ExtractArray(raw, "questions");
    }

    public async Task<List<JsonElement>> GenerateInfoFactsAsync(string topicName, string prompt, int count, List<string> contextDocuments)
    {
        const string system =
            "You are writing short, accurate educational facts for a daily-learning app. Respond ONLY with valid JSON: " +
            "{\"facts\": [{\"title\": str, \"description\": str, \"link\": str or null}]}. " +
            "title is a short headline (max ~10 words). description is 2-4 sentences, self-contained and accurate, " +
            "understandable without any other context. link, if included, must be a real, well-known reference URL " +
            "(e.g. Wikipedia or official docs) directly relevant to the fact; use null if unsure.";

        var userPrompt = $"Topic: {topicName}\nInstructions: {prompt}\nGenerate exactly {count} distinct facts.";

        var raw = await GenerateAsync(userPrompt, system, jsonMode: true, contextDocuments);
        return ExtractArray(raw, "facts");
    }

    private static List<JsonElement> ExtractArray(string raw, string key)
    {
        JsonElement parsed;
        try
        {
            parsed = JsonSerializer.Deserialize<JsonElement>(raw);
        }
        catch (JsonException exc)
        {
            throw new OllamaUnavailableException($"Ollama returned invalid JSON: {exc.Message}");
        }

        if (parsed.ValueKind == JsonValueKind.Object && parsed.TryGetProperty(key, out var arr) && arr.ValueKind == JsonValueKind.Array)
        {
            return [.. arr.EnumerateArray()];
        }
        return [];
    }

    public async Task<(bool IsCorrect, string? Feedback)> ReviewOpenAnswerAsync(string questionText, string correctAnswer, string givenAnswer, List<string> contextDocuments)
    {
        const string system =
            "You are grading a quiz answer. Respond ONLY with valid JSON: " +
            "{\"is_correct\": bool, \"feedback\": str}. Feedback should briefly explain why the answer " +
            "is right or wrong, in a friendly tone.";

        var userPrompt = $"Question: {questionText}\nExpected answer: {correctAnswer}\nUser's answer: {givenAnswer}";

        var raw = await GenerateAsync(userPrompt, system, jsonMode: true, contextDocuments);
        JsonElement parsed;
        try
        {
            parsed = JsonSerializer.Deserialize<JsonElement>(raw);
        }
        catch (JsonException exc)
        {
            throw new OllamaUnavailableException($"Ollama returned invalid JSON: {exc.Message}");
        }

        var isCorrect = parsed.TryGetProperty("is_correct", out var ic) && ic.ValueKind is JsonValueKind.True or JsonValueKind.False && ic.GetBoolean();
        var feedback = parsed.TryGetProperty("feedback", out var fb) ? fb.GetString() : null;
        return (isCorrect, feedback);
    }

    private static string BuildResultLines(List<QuizResultLine> results)
        => string.Join(
            "\n",
            results.Select(r => $"- Q: {r.Text} | given: {r.GivenAnswer} | correct: {r.CorrectAnswer} | was_correct: {(r.IsCorrect is { } b ? (b ? "True" : "False") : "None")}"));

    private static string BuildContextDocuments(List<string> contexts)
    {
        StringBuilder contextText = new();
        for (int i = 0; i < contexts.Count; i++)
        {
            contextText.Append($"# ------ DOCUMENT {i+1} ------\n");
            contextText.Append(contexts[i]);
            contextText.Append("\n\n");
        }
        return contextText.ToString();
    }

    public async Task<string> ChatAboutQuizAsync(string topicName, List<QuizResultLine> results, List<QuizChatMessageDTO> history, string userMessage, List<string> contextDocuments)
    {
        const string system =
            "You are a friendly tutor helping a student review a quiz they just completed. " +
            "Answer their follow-up questions using the quiz context below. Be concise and clear. " +
            "If they ask something unrelated to the quiz or its topic, gently steer them back.";

        var parts = new List<string> { $"Topic: {topicName}", "Quiz results:", BuildResultLines(results) };
        if (history.Count > 0)
        {
            var conversationLines = string.Join("\n", history.Select(h => $"{h.Role}: {h.Content}"));
            parts.AddRange(["", "Conversation so far:", conversationLines]);
        }
        parts.AddRange(["", $"Student's new question: {userMessage}"]);

        return await GenerateAsync(string.Join("\n", parts), system, jsonMode: false, contextDocuments);
    }

    public async Task<string> GenerateQuizRecapAsync(string topicName, List<QuizResultLine> results, List<string> contextDocuments)
    {
        const string system =
            "You are a friendly tutor writing a short end-of-quiz recap (3-6 sentences). " +
            "Summarize performance and explain the mistakes in plain language.";

        var userPrompt = $"Topic: {topicName}\nResults:\n{BuildResultLines(results)}";
        return await GenerateAsync(userPrompt, system, jsonMode: false, contextDocuments);
    }
}
