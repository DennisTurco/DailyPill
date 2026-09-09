using DailyPill.Common.DTOs;
using DailyPill.Common.Interfaces;
using DailyPill.Common.Models;
using DailyPill.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace DailyPill.Infrastructure.Services;

public class TopicService(AppDbContext context) : ITopicService
{
    public async Task<List<TopicResponseDTO>> GetAllAsync()
    {
        var topics = await context.Topics
            .Include(t => t.Schedules)
            .Where(t => !t.IsDeleted)
            .OrderBy(t => t.Name)
            .ToListAsync();
        return topics.Select(MapToDto).ToList();
    }

    public async Task<TopicResponseDTO?> GetByIdAsync(int id)
    {
        var topic = await context.Topics.Include(t => t.Schedules)
            .FirstOrDefaultAsync(t => t.Id == id && !t.IsDeleted);
        return topic is null ? null : MapToDto(topic);
    }

    public async Task<TopicResponseDTO> CreateAsync(TopicRequestDTO dto)
    {
        var topic = new Topic
        {
            Name = dto.Name,
            Category = dto.Category,
            Description = dto.Description,
            Color = dto.Color,
            Icon = dto.Icon,
            IsInformational = dto.IsInformational,
        };

        if (dto.Schedules is not null)
        {
            foreach (var s in dto.Schedules)
            {
                topic.Schedules.Add(new TopicSchedule { DayOfWeek = s.DayOfWeek, TimeOfDay = s.TimeOfDay, IsActive = s.IsActive });
            }
        }

        context.Topics.Add(topic);
        await context.SaveChangesAsync();
        return MapToDto(topic);
    }

    public async Task<TopicResponseDTO?> UpdateAsync(int id, TopicRequestDTO dto)
    {
        var topic = await context.Topics.Include(t => t.Schedules)
            .FirstOrDefaultAsync(t => t.Id == id && !t.IsDeleted);
        if (topic is null) return null;

        topic.Name = dto.Name;
        topic.Category = dto.Category;
        topic.Description = dto.Description;
        topic.Color = dto.Color;
        topic.Icon = dto.Icon;
        topic.IsInformational = dto.IsInformational;

        if (dto.Schedules is not null)
        {
            context.TopicSchedules.RemoveRange(topic.Schedules);
            topic.Schedules.Clear();
            foreach (var s in dto.Schedules)
            {
                topic.Schedules.Add(new TopicSchedule { DayOfWeek = s.DayOfWeek, TimeOfDay = s.TimeOfDay, IsActive = s.IsActive });
            }
        }

        await context.SaveChangesAsync();
        return MapToDto(topic);
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var topic = await context.Topics.FirstOrDefaultAsync(t => t.Id == id && !t.IsDeleted);
        if (topic is null) return false;
        topic.IsDeleted = true;
        topic.DeletedAt = DateTime.UtcNow;
        await context.SaveChangesAsync();
        return true;
    }

    private static TopicResponseDTO MapToDto(Topic t) => new(
        t.Id, t.Name, t.Category, t.Description, t.Color, t.Icon, t.IsInformational, t.CreatedAt, t.IsDeleted,
        t.Schedules.Select(s => new TopicScheduleResponseDTO(s.Id, s.TopicId, s.DayOfWeek, s.TimeOfDay, s.IsActive)).ToList());
}
