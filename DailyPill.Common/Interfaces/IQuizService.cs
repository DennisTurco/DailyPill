using DailyPill.Common.DTOs;

namespace DailyPill.Common.Interfaces;

public interface IQuizService
{
    Task<QuizStartResponseDTO> StartAsync(QuizStartRequestDTO dto);
    Task<QuizSessionResponseDTO> SubmitAsync(int sessionId, QuizSubmitRequestDTO dto);
    Task<QuizFinishResponseDTO> FinishAsync(int sessionId);
    Task<QuizChatResponseDTO> ChatAsync(int sessionId, QuizChatRequestDTO dto);
    Task<QuizHintResponseDTO> HintAsync(int sessionId, QuizHintRequestDTO dto);
    Task<QuizFinishResponseDTO> GetFollowUpQuestionAsync(int sessionId, int answerId);
    Task<QuizFinishResponseDTO> AnswerFollowUpAsync(int sessionId, int answerId, FollowUpAnswerRequestDTO dto);
    Task<List<QuizSessionResponseDTO>> GetHistoryAsync(int? topicId);
    Task<QuizSessionResponseDTO?> GetByIdAsync(int sessionId);
}
