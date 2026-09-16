using DailyPill.Common.DTOs;

namespace DailyPill.Common.Interfaces;

public interface ITopicService
{
    Task<List<TopicResponseDTO>> GetAllAsync();
    Task<TopicResponseDTO> GetTopicWithQuestionsOrFactsAsync(int id);
    Task<TopicResponseDTO> GetByIdAsync(int id);
    Task<TopicResponseDTO?> GetByNameAsync(string name);
    Task<TopicResponseDTO> CreateAsync(TopicRequestDTO dto);
    Task<TopicResponseDTO?> UpdateAsync(int id, TopicRequestDTO dto);
    Task<bool> DeleteAsync(int id);
}
