using DailyPill.Common.DTOs;
using DailyPill.Common.Interfaces;
using DailyPill.Common.Models;
using DailyPill.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace DailyPill.Infrastructure.Services;

public class TopicContextDocumentService(AppDbContext context) : ITopicContextDocumentService
{
    public async Task<TopicContextDocumentResponseDTO?> GetByIdAsync(int id)
        => await context.TopicContextDocument
            .AsNoTracking()
            .Where(d => d.Id == id)
            .Select(d => MapToDTO(d))
            .FirstOrDefaultAsync();

    public async Task<List<string>> GetAllContextByTopicIdAsync(int topicId)
        => await context.TopicContextDocument
            .AsNoTracking()
            .Where(d => d.TopicId == topicId)
            .Select(d => d.ExtractedText)
            .ToListAsync();

    public async Task<TopicContextDocumentResponseDTO> UploadAsync(int topicId, Stream stream, string filename)
    {
        if (!filename.EndsWith(".md", StringComparison.OrdinalIgnoreCase))
            throw new ArgumentException("Only .md documents are allowed");

        using var reader = new StreamReader(stream);
        var extractedText = await reader.ReadToEndAsync();

        var contextDocument = new TopicContextDocument
        {
            TopicId = topicId,
            Filename = filename,
            ExtractedText = extractedText,
        };

        context.TopicContextDocument.Add(contextDocument);
        await context.SaveChangesAsync();
        return MapToDTO(contextDocument);
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var contextDocument = await context.TopicContextDocument
            .FirstOrDefaultAsync(d => d.Id == id);

        if (contextDocument is null) return false;
        context.Remove(contextDocument);
        await context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> DeleteAllByTopicIdAsync(int id)
    {
        var documents = await context.TopicContextDocument
            .Where(d => d.TopicId == id)
            .ToListAsync();

        if (documents is null || documents.Count == 0)
            return false;

        context.RemoveRange(documents);

        await context.SaveChangesAsync();
        return true;
    }

    private static TopicContextDocumentResponseDTO MapToDTO(TopicContextDocument d)
        => new(d.Id, d.TopicId, d.Filename);
}
