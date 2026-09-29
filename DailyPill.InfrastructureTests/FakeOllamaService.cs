using System.Text.Json;
using DailyPill.Common.DTOs;
using DailyPill.Common.Enums;
using DailyPill.Common.Exceptions;
using DailyPill.Common.Interfaces;

namespace DailyPill.InfrastructureTests;

/// <summary>No-op fake mirroring the Python tests' implicit "Ollama unreachable" environment.</summary>
public class FakeOllamaService : IOllamaService
{
    public string Model => "test-model";
    public string BaseUrl => "http://localhost:11434";
    public bool GpuEnabled => false;

    public bool IsAvailable() => false;
    public bool? HasModel() => null;
    public PullState GetPullState() => new(false, null, null, null);
    public void Bootstrap() { }

    public Task<IEnumerable<JsonElement>> GenerateQuestionsAsync(string topicName, string prompt, int count, int? difficulty, IEnumerable<string> contextDocuments) =>
        throw new OllamaUnavailableException("Ollama unreachable (fake)");

    public Task<IEnumerable<JsonElement>> GenerateInfoFactsAsync(string topicName, string prompt, int count, IEnumerable<string> contextDocuments) =>
        throw new OllamaUnavailableException("Ollama unreachable (fake)");

    public Task<OpenAnswerReview> ReviewOpenAnswerAsync(string questionText, string correctAnswer, string givenAnswer, IEnumerable<string> contextDocuments, TutorStyle style) =>
        throw new OllamaUnavailableException("Ollama unreachable (fake)");

    public Task<string> ChatAboutQuizAsync(string topicName, IEnumerable<QuizResultLine> results, List<QuizChatMessageDTO> history, string userMessage, IEnumerable<string> contextDocuments, TutorStyle style) =>
        throw new OllamaUnavailableException("Ollama unreachable (fake)");

    public Task<string> GenerateHintAsync(string questionText, string correctAnswer, IEnumerable<string> contextDocuments, TutorStyle style) =>
        throw new OllamaUnavailableException("Ollama unreachable (fake)");

    public Task<string> GenerateQuizRecapAsync(string topicName, IEnumerable<QuizResultLine> results, IEnumerable<string> contextDocuments, TutorStyle style) =>
        throw new OllamaUnavailableException("Ollama unreachable (fake)");
}
