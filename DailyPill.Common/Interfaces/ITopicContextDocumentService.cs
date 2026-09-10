using DailyPill.Common.DTOs;

namespace DailyPill.Common.Interfaces;

public interface ITopicContextDocumentService
{
    Task<TopicContextDocumentResponseDTO?> GetByIdAsync(int id);
    Task<List<string>> GetAllContextByTopicIdAsync(int topicId);
    Task<TopicContextDocumentResponseDTO> UploadAsync(int id, Stream stream, string filename, string contentType);
    Task<bool> DeleteAsync(int id);
}
