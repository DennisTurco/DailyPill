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

    /// <summary>When set, the fake acts as reachable and grades open answers with this review.</summary>
    public OpenAnswerReview? OpenAnswerReview { get; init; }

    public bool IsAvailable() => OpenAnswerReview is not null;
    public bool? HasModel() => null;
    public PullState GetPullState() => new(false, null, null, null);
    public void Bootstrap() { }

    public Task<IEnumerable<JsonElement>> GenerateQuestionsAsync(string topicName, string prompt, int count, int? difficulty, IEnumerable<string> contextDocuments) =>
        throw new OllamaUnavailableException("Ollama unreachable (fake)");

    public Task<IEnumerable<JsonElement>> GenerateInfoFactsAsync(string topicName, string prompt, int count, IEnumerable<string> contextDocuments) =>
        throw new OllamaUnavailableException("Ollama unreachable (fake)");

    /// <summary>When set, follow-up answers are graded with this review.</summary>
    public FollowUpReview? FollowUpReview { get; init; }

    public Task<OpenAnswerReview> ReviewOpenAnswerAsync(string questionText, string correctAnswer, string givenAnswer, string? confidence, IEnumerable<string> contextDocuments, TutorStyle style) =>
        OpenAnswerReview is { } review ? Task.FromResult(review) : throw new OllamaUnavailableException("Ollama unreachable (fake)");

    public Task<string> GenerateFollowUpQuestionAsync(string questionText, string correctAnswer, string givenAnswer, string? reviewFeedback, IEnumerable<string> contextDocuments, TutorStyle style) =>
        OpenAnswerReview is not null ? Task.FromResult("And what about the part you left out?") : throw new OllamaUnavailableException("Ollama unreachable (fake)");

    public Task<FollowUpReview> ReviewFollowUpAnswerAsync(string questionText, string correctAnswer, string givenAnswer, string followUpQuestion, string followUpAnswer, IEnumerable<string> contextDocuments, TutorStyle style) =>
        FollowUpReview is { } review ? Task.FromResult(review) : throw new OllamaUnavailableException("Ollama unreachable (fake)");

    public Task<string> ChatAboutQuizAsync(string topicName, IEnumerable<QuizResultLine> results, List<QuizChatMessageDTO> history, string userMessage, IEnumerable<string> contextDocuments, TutorStyle style) =>
        throw new OllamaUnavailableException("Ollama unreachable (fake)");

    public Task<string> GenerateHintAsync(string questionText, string correctAnswer, IEnumerable<string> contextDocuments, TutorStyle style) =>
        throw new OllamaUnavailableException("Ollama unreachable (fake)");

    public Task<string> GenerateQuizRecapAsync(string topicName, IEnumerable<QuizResultLine> results, IEnumerable<string> contextDocuments, TutorStyle style) =>
        throw new OllamaUnavailableException("Ollama unreachable (fake)");
}
