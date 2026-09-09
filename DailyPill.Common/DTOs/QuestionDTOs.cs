using DailyPill.Common.Enums;

namespace DailyPill.Common.DTOs;

public record QuestionRequestDTO(
    int TopicId,
    QuestionType Type,
    string Text,
    List<string>? Options,
    string CorrectAnswer,
    int Difficulty,
    string? Explanation);

public record QuestionResponseDTO(
    int Id,
    int TopicId,
    QuestionType Type,
    string Text,
    List<string>? Options,
    string CorrectAnswer,
    int Difficulty,
    string? Explanation,
    DateTime CreatedAt,
    bool IsDeleted);

public record AIGeneratedQuestionDTO(
    QuestionType Type,
    string Text,
    List<string>? Options,
    string CorrectAnswer,
    int Difficulty,
    string? Explanation);

public record AIGenerateQuestionsRequestDTO(int TopicId, string Prompt, int Count = 5, int? Difficulty = null);

public record AIGenerateQuestionsResponseDTO(List<AIGeneratedQuestionDTO> Questions, int Dropped = 0);
