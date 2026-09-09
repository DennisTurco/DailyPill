using DailyPill.Common.DTOs;

namespace DailyPill.Common.Interfaces;

public interface IQuizService
{
    Task<QuizStartResponseDTO> StartAsync(QuizStartRequestDTO dto);
    Task<QuizSessionResponseDTO> SubmitAsync(int sessionId, QuizSubmitRequestDTO dto);
    Task<QuizFinishResponseDTO> FinishAsync(int sessionId);
    Task<QuizChatResponseDTO> ChatAsync(int sessionId, QuizChatRequestDTO dto);
    Task<List<QuizSessionResponseDTO>> GetHistoryAsync(int? topicId);
    Task<QuizSessionResponseDTO?> GetByIdAsync(int sessionId);
}
