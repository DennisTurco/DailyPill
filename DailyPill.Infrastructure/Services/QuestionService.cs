using DailyPill.Common.DTOs;
using DailyPill.Common.Enums;
using DailyPill.Common.Interfaces;
using DailyPill.Common.Models;
using DailyPill.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace DailyPill.Infrastructure.Services;

public class QuestionService(AppDbContext context) : IQuestionService
{
    public async Task<List<QuestionResponseDTO>> GetAllAsync(int? topicId, int? difficulty, QuestionType? type)
    {
        var query = context.Questions.Where(q => !q.IsDeleted);
        if (topicId.HasValue) query = query.Where(q => q.TopicId == topicId.Value);
        if (difficulty.HasValue) query = query.Where(q => q.Difficulty == difficulty.Value);
        if (type.HasValue) query = query.Where(q => q.Type == type.Value);

        var questions = await query.OrderBy(q => q.Id).ToListAsync();
        return questions.Select(MapToDto).ToList();
    }

    public async Task<List<QuestionResponseDTO>> GetRandomAsync(int topicId, int count)
    {
        var candidates = await context.Questions
            .Where(q => q.TopicId == topicId && !q.IsDeleted)
            .ToListAsync();
        if (candidates.Count == 0) return [];

        var candidateIds = candidates.Select(q => q.Id).ToList();
        var wrongCounts = await context.UserAnswers
            .Where(a => candidateIds.Contains(a.QuestionId) && a.IsCorrect == false)
            .GroupBy(a => a.QuestionId)
            .Select(g => new { QuestionId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.QuestionId, x => x.Count);

        var pool = candidates.ToList();
        var weights = pool.Select(q => 1.0 + 2.0 * wrongCounts.GetValueOrDefault(q.Id, 0)).ToList();

        var chosen = new List<Question>();
        var random = Random.Shared;
        while (pool.Count > 0 && chosen.Count < count)
        {
            var index = WeightedRandomIndex(weights, random);
            chosen.Add(pool[index]);
            pool.RemoveAt(index);
            weights.RemoveAt(index);
        }

        return chosen.Select(q => ShuffleOptions(MapToDto(q))).ToList();
    }

    private static int WeightedRandomIndex(List<double> weights, Random random)
    {
        var total = weights.Sum();
        var target = random.NextDouble() * total;
        var cumulative = 0.0;
        for (var i = 0; i < weights.Count; i++)
        {
            cumulative += weights[i];
            if (target < cumulative) return i;
        }
        return weights.Count - 1;
    }

    public static QuestionResponseDTO ShuffleOptions(QuestionResponseDTO dto)
    {
        if (dto.Options is null || dto.Options.Count <= 1) return dto;
        var shuffled = dto.Options.OrderBy(_ => Random.Shared.Next()).ToList();
        return dto with { Options = shuffled };
    }

    public async Task<QuestionResponseDTO?> GetByIdAsync(int id)
    {
        var question = await context.Questions.FirstOrDefaultAsync(q => q.Id == id && !q.IsDeleted);
        return question is null ? null : MapToDto(question);
    }

    public async Task<QuestionResponseDTO> CreateAsync(QuestionRequestDTO dto)
    {
        ValidateDifficulty(dto.Difficulty);

        var question = new Question
        {
            TopicId = dto.TopicId,
            Type = dto.Type,
            Text = dto.Text,
            Options = dto.Options,
            CorrectAnswer = dto.CorrectAnswer,
            Difficulty = dto.Difficulty,
            Explanation = dto.Explanation,
        };
        context.Questions.Add(question);
        await context.SaveChangesAsync();
        return MapToDto(question);
    }

    public async Task<QuestionResponseDTO?> UpdateAsync(int id, QuestionRequestDTO dto)
    {
        var question = await context.Questions.FirstOrDefaultAsync(q => q.Id == id && !q.IsDeleted);
        if (question is null) return null;

        // Mirrors the Python backend: difficulty is validated on create but NOT on update.
        question.TopicId = dto.TopicId;
        question.Type = dto.Type;
        question.Text = dto.Text;
        question.Options = dto.Options;
        question.CorrectAnswer = dto.CorrectAnswer;
        question.Difficulty = dto.Difficulty;
        question.Explanation = dto.Explanation;

        await context.SaveChangesAsync();
        return MapToDto(question);
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var question = await context.Questions.FirstOrDefaultAsync(q => q.Id == id && !q.IsDeleted);
        if (question is null) return false;
        question.IsDeleted = true;
        question.DeletedAt = DateTime.UtcNow;
        await context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> DeleteAllByTopicIdAsync(int topicId)
    {
        var questions = await context.Questions
            .Where(q => q.TopicId == topicId && !q.IsDeleted)
            .ToListAsync();

        if (questions.Count == 0) return false;

        var now = DateTime.UtcNow;
        foreach (var question in questions)
        {
            question.IsDeleted = true;
            question.DeletedAt = now;
        }

        await context.SaveChangesAsync();
        return true;
    }

    private static void ValidateDifficulty(int difficulty)
    {
        if (difficulty is < 1 or > 5)
        {
            throw new ArgumentOutOfRangeException(nameof(difficulty), "difficulty must be between 1 and 5");
        }
    }

    public static QuestionResponseDTO MapToDto(Question q) => new(
        q.Id, q.TopicId, q.Type, q.Text, q.Options, q.CorrectAnswer, q.Difficulty, q.Explanation, q.CreatedAt, q.IsDeleted);
}
