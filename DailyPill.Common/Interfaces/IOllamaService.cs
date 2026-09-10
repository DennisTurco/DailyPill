using System.Text.Json;
using DailyPill.Common.DTOs;

namespace DailyPill.Common.Interfaces;

public interface IOllamaService
{
    string Model { get; }
    string BaseUrl { get; }
    bool GpuEnabled { get; }

    bool IsAvailable();

    /// <summary>True/false if Ollama answered, null if it couldn't be reached at all.</summary>
    bool? HasModel();

    PullState GetPullState();

    /// <summary>Fire-and-forget: ensures Ollama is running and the configured model is present.</summary>
    void Bootstrap();

    Task<List<JsonElement>> GenerateQuestionsAsync(string topicName, string prompt, int count, int? difficulty, List<string> contextDocuments);
    Task<List<JsonElement>> GenerateInfoFactsAsync(string topicName, string prompt, int count, List<string> contextDocuments);
    Task<(bool IsCorrect, string? Feedback)> ReviewOpenAnswerAsync(string questionText, string correctAnswer, string givenAnswer, List<string> contextDocuments);
    Task<string> ChatAboutQuizAsync(string topicName, List<QuizResultLine> results, List<QuizChatMessageDTO> history, string userMessage, List<string> contextDocuments);
    Task<string> GenerateQuizRecapAsync(string topicName, List<QuizResultLine> results, List<string> contextDocuments);
}
