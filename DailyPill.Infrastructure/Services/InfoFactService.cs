using DailyPill.Common.DTOs;
using DailyPill.Common.Exceptions;
using DailyPill.Common.Interfaces;
using DailyPill.Common.Models;
using DailyPill.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace DailyPill.Infrastructure.Services;

public class InfoFactService(AppDbContext context) : IInfoFactService
{
    public async Task<List<InfoFactResponseDTO>> GetAllAsync(int? topicId)
    {
        var query = context.InfoFacts.Where(f => !f.IsDeleted);
        if (topicId.HasValue) query = query.Where(f => f.TopicId == topicId.Value);
        var facts = await query.OrderBy(f => f.Id).ToListAsync();
        return facts.Select(MapToDto).ToList();
    }

    public async Task<InfoFactResponseDTO> CreateAsync(InfoFactRequestDTO dto)
    {
        var fact = new InfoFact
        {
            TopicId = dto.TopicId,
            Title = dto.Title,
            Description = dto.Description,
            Link = dto.Link,
        };
        context.InfoFacts.Add(fact);
        await context.SaveChangesAsync();
        return MapToDto(fact);
    }

    public async Task<InfoFactResponseDTO> GetDailyAsync()
    {
        var facts = await context.InfoFacts.Where(f => !f.IsDeleted).ToListAsync();
        if (facts.Count == 0) throw new NotFoundException("No info facts available");

        var today = DateTime.UtcNow.Date;
        var alreadyShown = facts.FirstOrDefault(f => f.LastShownAt.HasValue && f.LastShownAt.Value.Date == today);
        if (alreadyShown is not null) return MapToDto(alreadyShown);

        var weights = facts.Select(f => f.LastShownAt is null
            ? 10.0
            : 1.0 + (DateTime.UtcNow - f.LastShownAt.Value).Days).ToList();
        var total = weights.Sum();
        var target = Random.Shared.NextDouble() * total;
        var cumulative = 0.0;
        var chosen = facts[^1];
        for (var i = 0; i < facts.Count; i++)
        {
            cumulative += weights[i];
            if (target < cumulative)
            {
                chosen = facts[i];
                break;
            }
        }

        chosen.LastShownAt = DateTime.UtcNow;
        await context.SaveChangesAsync();
        return MapToDto(chosen);
    }

    public async Task<InfoFactResponseDTO?> GetByIdAsync(int id)
    {
        var fact = await context.InfoFacts.FirstOrDefaultAsync(f => f.Id == id && !f.IsDeleted);
        return fact is null ? null : MapToDto(fact);
    }

    public async Task<InfoFactResponseDTO?> UpdateAsync(int id, InfoFactRequestDTO dto)
    {
        var fact = await context.InfoFacts.FirstOrDefaultAsync(f => f.Id == id && !f.IsDeleted);
        if (fact is null) return null;

        fact.TopicId = dto.TopicId;
        fact.Title = dto.Title;
        fact.Description = dto.Description;
        fact.Link = dto.Link;

        await context.SaveChangesAsync();
        return MapToDto(fact);
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var fact = await context.InfoFacts.FirstOrDefaultAsync(f => f.Id == id && !f.IsDeleted);
        if (fact is null) return false;
        fact.IsDeleted = true;
        fact.DeletedAt = DateTime.UtcNow;
        await context.SaveChangesAsync();
        return true;
    }

    private static InfoFactResponseDTO MapToDto(InfoFact f) => new(
        f.Id, f.TopicId, f.Title, f.Description, f.Link, f.CreatedAt, f.LastShownAt, f.IsDeleted);
}
