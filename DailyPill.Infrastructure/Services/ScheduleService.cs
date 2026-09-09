using DailyPill.Common.DTOs;
using DailyPill.Common.Interfaces;
using DailyPill.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace DailyPill.Infrastructure.Services;

public class ScheduleService(AppDbContext context) : IScheduleService
{
    public async Task<List<ResolvedScheduleDTO>> GetActiveAsync()
    {
        var rows = await context.TopicSchedules
            .Include(s => s.Topic)
            .Where(s => s.IsActive && s.Topic != null && !s.Topic.IsDeleted)
            .ToListAsync();

        return rows.Select(s => new ResolvedScheduleDTO(
            s.TopicId,
            s.Topic!.Name,
            s.DayOfWeek,
            s.TimeOfDay.ToString(@"hh\:mm"))).ToList();
    }
}
