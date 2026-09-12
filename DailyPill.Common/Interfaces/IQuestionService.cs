using DailyPill.Common.DTOs;
using DailyPill.Common.Enums;

namespace DailyPill.Common.Interfaces;

public interface IQuestionService
{
    Task<List<QuestionResponseDTO>> GetAllAsync(int? topicId, int? difficulty, QuestionType? type);
    Task<List<QuestionResponseDTO>> GetRandomAsync(int topicId, int count);
    Task<QuestionResponseDTO?> GetByIdAsync(int id);
    Task<QuestionResponseDTO> CreateAsync(QuestionRequestDTO dto);
    Task<QuestionResponseDTO?> UpdateAsync(int id, QuestionRequestDTO dto);
    Task<bool> DeleteAsync(int id);
    Task<bool> DeleteAllByTopicIdAsync(int topicId);
}
