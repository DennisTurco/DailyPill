namespace DailyPill.Common.DTOs;

public record QuizStartRequestDTO(int TopicId, int QuestionCount = 5);

public record QuizStartResponseDTO(int SessionId, int TopicId, List<QuestionResponseDTO> Questions, bool AiAvailable);

public record AnswerSubmitDTO(int QuestionId, string GivenAnswer);

public record QuizSubmitRequestDTO(List<AnswerSubmitDTO> Answers);

public record UserAnswerResponseDTO(
    int Id,
    int QuestionId,
    string GivenAnswer,
    bool? IsCorrect,
    double ScoreAwarded,
    string? AiFeedback,
    DateTime AnsweredAt);

public record QuizSessionResponseDTO(
    int Id,
    int TopicId,
    DateTime StartedAt,
    DateTime? CompletedAt,
    string? AiReviewSummary,
    List<UserAnswerResponseDTO> Answers);

public record QuizFinishResponseDTO(QuizSessionResponseDTO Session, double TotalScore, double MaxScore);

public record QuizChatMessageDTO(string Role, string Content);

public record QuizChatRequestDTO(string Message, List<QuizChatMessageDTO>? History);

public record QuizChatResponseDTO(string Reply);
