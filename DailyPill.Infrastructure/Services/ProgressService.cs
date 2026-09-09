using DailyPill.Common.DTOs;
using DailyPill.Common.Interfaces;
using DailyPill.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace DailyPill.Infrastructure.Services;

public class ProgressService(AppDbContext context) : IProgressService
{
    public async Task<ProgressSummaryDTO> GetSummaryAsync()
    {
        var byTopic = await TopicProgressAsync();
        var byDifficulty = await DifficultyProgressAsync();
        var totalAnswers = byTopic.Sum(t => t.TotalAnswers);
        var totalCorrect = byTopic.Sum(t => t.CorrectAnswers);
        var weakest = byTopic.Where(t => t.TotalAnswers > 0).OrderBy(t => t.Accuracy).Take(3).ToList();

        return new ProgressSummaryDTO(
            TotalQuizSessions: await context.QuizSessions.CountAsync(),
            TotalAnswers: totalAnswers,
            OverallAccuracy: totalAnswers > 0 ? (double)totalCorrect / totalAnswers : 0.0,
            CurrentStreakDays: await CurrentStreakDaysAsync(),
            ByTopic: byTopic,
            ByDifficulty: byDifficulty,
            WeakestTopics: weakest);
    }

    private async Task<List<TopicProgressDTO>> TopicProgressAsync()
    {
        var topics = await context.Topics.Where(t => !t.IsDeleted && !t.IsInformational).ToListAsync();
        var result = new List<TopicProgressDTO>();

        foreach (var topic in topics)
        {
            var answers = await context.UserAnswers
                .Where(a => context.Questions.Any(q => q.Id == a.QuestionId && q.TopicId == topic.Id))
                .ToListAsync();
            var questionCount = await context.Questions.CountAsync(q => q.TopicId == topic.Id && !q.IsDeleted);

            var graded = answers.Where(a => a.IsCorrect is not null).ToList();
            var total = graded.Count;
            var correct = graded.Count(a => a.IsCorrect is true);

            result.Add(new TopicProgressDTO(
                topic.Id, topic.Name, questionCount, total, correct,
                total > 0 ? (double)correct / total : 0.0,
                total > 0 ? graded.Sum(a => a.ScoreAwarded) / total : 0.0));
        }

        return result;
    }

    private async Task<List<DifficultyProgressDTO>> DifficultyProgressAsync()
    {
        var result = new List<DifficultyProgressDTO>();
        for (var difficulty = 1; difficulty <= 5; difficulty++)
        {
            var answers = await context.UserAnswers
                .Where(a => context.Questions.Any(q => q.Id == a.QuestionId && q.Difficulty == difficulty))
                .ToListAsync();
            var graded = answers.Where(a => a.IsCorrect is not null).ToList();
            var total = graded.Count;
            var correct = graded.Count(a => a.IsCorrect == true);

            result.Add(new DifficultyProgressDTO(difficulty, total, correct, total > 0 ? (double)correct / total : 0.0));
        }
        return result;
    }

    private async Task<int> CurrentStreakDaysAsync()
    {
        var sessions = await context.QuizSessions
            .Where(s => s.CompletedAt != null)
            .OrderByDescending(s => s.CompletedAt)
            .ToListAsync();

        var days = sessions.Select(s => s.CompletedAt!.Value.Date).Distinct().OrderByDescending(d => d).ToList();
        if (days.Count == 0) return 0;

        var streak = 0;
        var expected = DateTime.UtcNow.Date;
        foreach (var day in days)
        {
            if (day == expected)
            {
                streak++;
                expected = expected.AddDays(-1);
            }
            else
            {
                break;
            }
        }
        return streak;
    }
}
