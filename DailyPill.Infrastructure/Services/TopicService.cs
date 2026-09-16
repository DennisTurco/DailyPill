using DailyPill.Common.DTOs;
using DailyPill.Common.Exceptions;
using DailyPill.Common.Interfaces;
using DailyPill.Common.Models;
using DailyPill.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace DailyPill.Infrastructure.Services;

public class TopicService(
    AppDbContext context,
    ITopicContextDocumentService topicContextDocumentService,
    IQuestionService questionService,
    IInfoFactService infoFactService) : ITopicService
{
    public async Task<List<TopicResponseDTO>> GetAllAsync()
    {
        var topics = await context.Topics
            .AsNoTracking()
            .Include(t => t.Schedules)
            .Include(t => t.Documents)
            .Where(t => !t.IsDeleted)
            .OrderBy(t => t.Name)
            .ToListAsync();
        return topics.Select(MapToDto).ToList();
    }

    public async Task<TopicResponseDTO?> GetTopicWithQuestionsOrFactsAsync(int id)
    {
        var topic = await context.Topics
            .AsNoTracking()
            .Include(t => t.Schedules)
            .Include(t => t.Facts)
            .Include(t => t.Questions)
            .FirstOrDefaultAsync(t => t.Id == id && !t.IsDeleted)
            ?? throw new NotFoundException("Topic not found");
        return MapToDto(topic);
    }

    public async Task<TopicResponseDTO?> GetByIdAsync(int id)
    {
        var topic = await context.Topics
            .AsNoTracking()
            .Include(t => t.Schedules)
            .Include(t => t.Documents)
            .FirstOrDefaultAsync(t => t.Id == id && !t.IsDeleted)
            ?? throw new NotFoundException("Topic not found");
        return MapToDto(topic);
    }

    public async Task<TopicResponseDTO?> GetByNameAsync(string name)
    {
        var topic = await context.Topics
            .AsNoTracking()
            .FirstOrDefaultAsync(t => t.Name == name && !t.IsDeleted)
            ?? throw new NotFoundException("Topic not found");
        return MapToDto(topic);
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
        var topic = await context.Topics
            .Include(t => t.Schedules)
            .Include(t => t.Documents)
            .FirstOrDefaultAsync(t => t.Id == id && !t.IsDeleted)
            ?? throw new NotFoundException("Topic not found");

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
        var topic = await context.Topics
            .FirstOrDefaultAsync(t => t.Id == id && !t.IsDeleted)
            ?? throw new NotFoundException("Topic not found");

        topic.IsDeleted = true;
        topic.DeletedAt = DateTime.UtcNow;
        await context.SaveChangesAsync();
        await topicContextDocumentService.DeleteAllByTopicIdAsync(id);
        await questionService.DeleteAllByTopicIdAsync(id);
        await infoFactService.DeleteAllByTopicIdAsync(id);
        return true;
    }

    private static TopicResponseDTO MapToDto(Topic t) => new(
        t.Id, t.Name, t.Category, t.Description, t.Color, t.Icon, t.IsInformational, t.CreatedAt, t.IsDeleted,
        t.Questions.Select(q => new QuestionResponseDTO(q.Id, q.TopicId, q.Type, q.Text, q.Options, q.CorrectAnswer, q.Difficulty, q.Explanation, q.CreatedAt, q.IsDeleted)).ToList(),
        t.Facts.Select(i => new InfoFactResponseDTO(i.Id, i.TopicId, i.Title, i.Description, i.Link, i.CreatedAt, i.LastShownAt, i.IsDeleted)).ToList(),
        t.Schedules.Select(s => new TopicScheduleResponseDTO(s.Id, s.TopicId, s.DayOfWeek, s.TimeOfDay, s.IsActive)).ToList(),
        t.Documents.Select(d => new TopicContextDocumentResponseDTO(d.Id, d.TopicId, d.Filename)).ToList());
}
