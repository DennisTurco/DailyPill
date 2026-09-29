using System.Text;
using DailyPill.Common.DTOs;
using DailyPill.Common.Exceptions;
using DailyPill.Common.Interfaces;
using DailyPill.Infrastructure.Config;
using Microsoft.Extensions.Logging;
using Whisper.net;
using Whisper.net.Ggml;

namespace DailyPill.Infrastructure.Services;

/// <summary>
/// Local speech-to-text for voice answers, backed by whisper.cpp (Whisper.net). The ggml model is
/// downloaded on first start into the data directory, mirroring how OllamaService auto-pulls its model.
/// </summary>
public class WhisperTranscriptionService : ITranscriptionService, IDisposable
{
    // Whisper only uses the tail of the initial prompt; the question text is plenty of vocabulary.
    private const int MaxPromptLength = 500;

    private readonly ILogger<WhisperTranscriptionService> _logger;
    private readonly string _modelsDir;
    private readonly string _language;
    private readonly GgmlType? _modelType;

    // One transcription at a time: whisper.cpp already uses every core, and it shares the
    // machine with Ollama, which grades the answer right after.
    private readonly SemaphoreSlim _processLock = new(1, 1);

    private readonly object _stateLock = new();
    private WhisperFactory? _factory;
    private bool _downloading;
    private string? _status;

    public string Model { get; }

    public WhisperTranscriptionService(AppSettings settings, string modelsDir, ILogger<WhisperTranscriptionService> logger)
    {
        _logger = logger;
        _modelsDir = modelsDir;
        _language = string.IsNullOrWhiteSpace(settings.WhisperLanguage) ? "auto" : settings.WhisperLanguage.Trim().ToLowerInvariant();
        Model = settings.WhisperModel.Trim();
        _modelType = ParseModelType(Model);

        if (_modelType is null && !IsDisabledValue(Model))
        {
            _logger.LogWarning("Unknown WHISPER_MODEL '{Model}'; voice answers are disabled", Model);
        }
    }

    private static bool IsDisabledValue(string model)
        => model.Length == 0 || model.Equals("none", StringComparison.OrdinalIgnoreCase) || model.Equals("off", StringComparison.OrdinalIgnoreCase);

    /// <summary>Accepts the usual whisper names ("base", "small.en", "large-v3-turbo") as well as the enum names.</summary>
    private static GgmlType? ParseModelType(string model)
    {
        var normalized = model.Replace("-", "").Replace(".", "").Replace("_", "");
        return Enum.TryParse<GgmlType>(normalized, ignoreCase: true, out var type) ? type : null;
    }

    public TranscriptionStatusResponseDTO GetStatus()
    {
        lock (_stateLock)
        {
            return new TranscriptionStatusResponseDTO(_modelType is not null, _factory is not null, Model, _downloading, _status);
        }
    }

    public void Bootstrap()
    {
        if (_modelType is null) return;
        _ = Task.Run(BootstrapAsync);
    }

    private async Task BootstrapAsync()
    {
        var modelPath = Path.Combine(_modelsDir, $"ggml-{_modelType!.Value.ToString().ToLowerInvariant()}.bin");
        try
        {
            if (!File.Exists(modelPath))
            {
                SetState(downloading: true, status: "downloading");
                Directory.CreateDirectory(_modelsDir);
                var tempPath = modelPath + ".part";
                await using (var modelStream = await WhisperGgmlDownloader.Default.GetGgmlModelAsync(_modelType.Value, QuantizationType.NoQuantization, CancellationToken.None))
                await using (var fileStream = File.Create(tempPath))
                {
                    await modelStream.CopyToAsync(fileStream);
                }
                File.Move(tempPath, modelPath, overwrite: true);
                _logger.LogInformation("Downloaded Whisper model '{Model}' to {Path}", Model, modelPath);
            }

            var factory = WhisperFactory.FromPath(modelPath);
            lock (_stateLock)
            {
                _factory = factory;
                _downloading = false;
                _status = "ready";
            }
            _logger.LogInformation("Whisper model '{Model}' loaded ({Runtime})", Model, WhisperFactory.GetRuntimeInfo());
        }
        catch (Exception exc)
        {
            _logger.LogWarning(exc, "Could not prepare Whisper model '{Model}'; voice answers are unavailable", Model);
            SetState(downloading: false, status: $"error: {exc.Message}");
        }
    }

    private void SetState(bool downloading, string status)
    {
        lock (_stateLock)
        {
            _downloading = downloading;
            _status = status;
        }
    }

    public async Task<string> TranscribeAsync(Stream wavStream, string? prompt, CancellationToken ct = default)
    {
        WhisperFactory factory;
        lock (_stateLock)
        {
            factory = _factory ?? throw new TranscriptionUnavailableException(
                _modelType is null
                    ? "Voice answers are disabled (set WHISPER_MODEL in .env to enable them)."
                    : $"Whisper model '{Model}' is not ready yet ({_status ?? "starting"}).");
        }

        // The WAV parser needs a seekable stream; request bodies aren't.
        using var buffer = new MemoryStream();
        await wavStream.CopyToAsync(buffer, ct);
        if (buffer.Length == 0) throw new ArgumentException("The audio file is empty.");
        buffer.Position = 0;

        await _processLock.WaitAsync(ct);
        try
        {
            var builder = factory.CreateBuilder().WithLanguage(_language);
            if (!string.IsNullOrWhiteSpace(prompt))
            {
                builder = builder.WithPrompt(prompt.Length > MaxPromptLength ? prompt[^MaxPromptLength..] : prompt);
            }

            await using var processor = builder.Build();
            var text = new StringBuilder();
            await foreach (var segment in processor.ProcessAsync(buffer, ct))
            {
                text.Append(segment.Text);
            }
            return text.ToString().Trim();
        }
        catch (Exception exc) when (exc is not OperationCanceledException and not TranscriptionUnavailableException)
        {
            throw new ArgumentException($"Could not transcribe the audio: {exc.Message}", exc);
        }
        finally
        {
            _processLock.Release();
        }
    }

    public void Dispose()
    {
        _factory?.Dispose();
        _processLock.Dispose();
        GC.SuppressFinalize(this);
    }
}
