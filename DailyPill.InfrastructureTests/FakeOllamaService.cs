using System.Text.Json;
using DailyPill.Common.DTOs;
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

    public Task<List<JsonElement>> GenerateQuestionsAsync(string topicName, string prompt, int count, int? difficulty) =>
        throw new OllamaUnavailableException("Ollama unreachable (fake)");

    public Task<List<JsonElement>> GenerateInfoFactsAsync(string topicName, string prompt, int count) =>
        throw new OllamaUnavailableException("Ollama unreachable (fake)");

    public Task<(bool IsCorrect, string? Feedback)> ReviewOpenAnswerAsync(string questionText, string correctAnswer, string givenAnswer) =>
        throw new OllamaUnavailableException("Ollama unreachable (fake)");

    public Task<string> ChatAboutQuizAsync(string topicName, List<QuizResultLine> results, List<QuizChatMessageDTO> history, string userMessage) =>
        throw new OllamaUnavailableException("Ollama unreachable (fake)");

    public Task<string> GenerateQuizRecapAsync(string topicName, List<QuizResultLine> results) =>
        throw new OllamaUnavailableException("Ollama unreachable (fake)");
}
