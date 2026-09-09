using DailyPill.Common.DTOs;

namespace DailyPill.Common.Interfaces;

public interface IInfoFactService
{
    Task<List<InfoFactResponseDTO>> GetAllAsync(int? topicId);
    Task<InfoFactResponseDTO> CreateAsync(InfoFactRequestDTO dto);
    Task<InfoFactResponseDTO> GetDailyAsync();
    Task<InfoFactResponseDTO?> GetByIdAsync(int id);
    Task<InfoFactResponseDTO?> UpdateAsync(int id, InfoFactRequestDTO dto);
    Task<bool> DeleteAsync(int id);
}
