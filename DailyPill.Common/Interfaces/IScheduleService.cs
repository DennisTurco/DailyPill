using DailyPill.Common.DTOs;

namespace DailyPill.Common.Interfaces;

public interface IScheduleService
{
    Task<List<ResolvedScheduleDTO>> GetActiveAsync();
}
