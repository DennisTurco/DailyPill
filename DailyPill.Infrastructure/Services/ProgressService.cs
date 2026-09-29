using DailyPill.Common.DTOs;
using DailyPill.Common.Interfaces;
using DailyPill.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace DailyPill.Infrastructure.Services;

public class ProgressService(AppDbContext context) : IProgressService
{
    // A question's accuracy reflects only its most recent graded answer, so getting it right on a
    // later attempt (e.g. a practice retry) replaces the earlier wrong one.
    private record GradedAnswer(int Id, int QuestionId, DateTime AnsweredAt, int TopicId, int Difficulty, bool IsCorrect, double ScoreAwarded);

    public async Task<ProgressSummaryDTO> GetSummaryAsync()
    {
        var latest = LatestPerQuestion(await GradedAnswersAsync());
        var byTopic = await TopicProgressAsync(latest);
        var byDifficulty = DifficultyProgress(latest);
        var totalAnswers = byTopic.Sum(t => t.TotalAnswers);
        var totalCorrect = byTopic.Sum(t => t.CorrectAnswers);
        var weakest = byTopic.Where(t => t.TotalAnswers > 0).OrderBy(t => t.Accuracy).Take(3).ToList();

        return new ProgressSummaryDTO(
            TotalQuizSessions: await context.QuizSessions.CountAsync(s => !s.IsPractice),
            TotalAnswers: totalAnswers,
            OverallAccuracy: totalAnswers > 0 ? (double)totalCorrect / totalAnswers : 0.0,
            CurrentStreakDays: await CurrentStreakDaysAsync(),
            ByTopic: byTopic,
            ByDifficulty: byDifficulty,
            WeakestTopics: weakest);
    }

    public async Task<ProgressTrendDTO> GetTrendAsync(int weeks)
    {
        weeks = Math.Clamp(weeks, 1, 52);
        var graded = await GradedAnswersAsync();
        var topics = await context.Topics
            .AsNoTracking()
            .Where(t => !t.IsDeleted && !t.IsInformational)
            .Select(t => new { t.Id, t.Name })
            .ToListAsync();

        // Weeks start on Monday (UTC); the last one is the current, still running week.
        var today = DateTime.UtcNow.Date;
        var currentWeekStart = today.AddDays(-(((int)today.DayOfWeek + 6) % 7));
        var weekStarts = Enumerable.Range(0, weeks).Select(i => currentWeekStart.AddDays(-7 * (weeks - 1 - i))).ToList();

        // Each point is a snapshot at the end of the week: the latest answer to every question seen so far,
        // so the line shows how mastery evolved rather than how a single week went.
        var snapshots = weekStarts.Select(start =>
        {
            var end = start.AddDays(7);
            return (Start: start, End: end, Latest: LatestPerQuestion(graded.Where(a => a.AnsweredAt < end)));
        }).ToList();

        TrendPointDTO Point(DateTime start, DateTime end, List<GradedAnswer> latest, Func<GradedAnswer, bool> filter)
        {
            var scoped = latest.Where(filter).ToList();
            var answeredThisWeek = graded.Count(a => a.AnsweredAt >= start && a.AnsweredAt < end && filter(a));
            double? accuracy = scoped.Count > 0 ? (double)scoped.Count(a => a.IsCorrect) / scoped.Count : null;
            return new TrendPointDTO(start, scoped.Count, answeredThisWeek, accuracy);
        }

        var overall = snapshots.Select(s => Point(s.Start, s.End, s.Latest, _ => true)).ToList();
        var byTopic = topics
            .Where(t => graded.Any(a => a.TopicId == t.Id))
            .Select(t => new TopicTrendDTO(t.Id, t.Name, snapshots.Select(s => Point(s.Start, s.End, s.Latest, a => a.TopicId == t.Id)).ToList()))
            .ToList();

        return new ProgressTrendDTO(overall, byTopic);
    }

    private async Task<List<GradedAnswer>> GradedAnswersAsync()
    {
        var graded = await context.UserAnswers
            .AsNoTracking()
            .Where(a => a.IsCorrect != null)
            .Select(a => new { a.Id, a.QuestionId, a.AnsweredAt, a.IsCorrect, a.ScoreAwarded, a.Question!.TopicId, a.Question.Difficulty })
            .ToListAsync();
        return graded
            .Select(a => new GradedAnswer(a.Id, a.QuestionId, a.AnsweredAt, a.TopicId, a.Difficulty, a.IsCorrect == true, a.ScoreAwarded))
            .ToList();
    }

    private static List<GradedAnswer> LatestPerQuestion(IEnumerable<GradedAnswer> answers) => answers
        .GroupBy(a => a.QuestionId)
        .Select(g => g.OrderByDescending(a => a.AnsweredAt).ThenByDescending(a => a.Id).First())
        .ToList();

    private async Task<List<TopicProgressDTO>> TopicProgressAsync(List<GradedAnswer> latest)
    {
        var topics = await context.Topics.Where(t => !t.IsDeleted && !t.IsInformational).ToListAsync();
        var result = new List<TopicProgressDTO>();

        foreach (var topic in topics)
        {
            var questionCount = await context.Questions.CountAsync(q => q.TopicId == topic.Id && !q.IsDeleted);
            var answers = latest.Where(a => a.TopicId == topic.Id).ToList();
            var total = answers.Count;
            var correct = answers.Count(a => a.IsCorrect);

            result.Add(new TopicProgressDTO(
                topic.Id, topic.Name, questionCount, total, correct,
                total > 0 ? (double)correct / total : 0.0,
                total > 0 ? answers.Sum(a => a.ScoreAwarded) / total : 0.0));
        }

        return result;
    }

    private static List<DifficultyProgressDTO> DifficultyProgress(List<GradedAnswer> latest)
    {
        var result = new List<DifficultyProgressDTO>();
        for (var difficulty = 1; difficulty <= 5; difficulty++)
        {
            var answers = latest.Where(a => a.Difficulty == difficulty).ToList();
            var total = answers.Count;
            var correct = answers.Count(a => a.IsCorrect);

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
