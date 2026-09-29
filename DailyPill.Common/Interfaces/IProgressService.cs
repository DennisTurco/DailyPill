using DailyPill.Common.DTOs;

namespace DailyPill.Common.Interfaces;

public interface IProgressService
{
    Task<ProgressSummaryDTO> GetSummaryAsync();
    Task<ProgressTrendDTO> GetTrendAsync(int weeks);
}
