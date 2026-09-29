namespace DailyPill.Common.DTOs;

/// <param name="QuestionIds">When set, starts a practice retry of exactly these questions instead of a random pick.</param>
public record QuizStartRequestDTO(int TopicId, int QuestionCount = 5, List<int>? QuestionIds = null);

public record QuizStartResponseDTO(int SessionId, int TopicId, List<QuestionResponseDTO> Questions, bool AiAvailable);

public record AnswerSubmitDTO(int QuestionId, string GivenAnswer, string? Confidence = null, bool HintUsed = false);

public record QuizSubmitRequestDTO(List<AnswerSubmitDTO> Answers);

public record UserAnswerResponseDTO(
    int Id,
    int QuestionId,
    string GivenAnswer,
    bool? IsCorrect,
    double ScoreAwarded,
    string? AiFeedback,
    string? LanguageFeedback,
    string? Confidence,
    bool HintUsed,
    DateTime AnsweredAt);

public record QuizSessionResponseDTO(
    int Id,
    int TopicId,
    DateTime StartedAt,
    DateTime? CompletedAt,
    string? AiReviewSummary,
    bool IsPractice,
    List<UserAnswerResponseDTO> Answers);

public record QuizFinishResponseDTO(QuizSessionResponseDTO Session, double TotalScore, double MaxScore);

public record QuizChatMessageDTO(string Role, string Content);

public record QuizChatRequestDTO(string Message, List<QuizChatMessageDTO>? History);

public record QuizChatResponseDTO(string Reply);

public record QuizHintRequestDTO(int QuestionId);

public record QuizHintResponseDTO(string Hint);
