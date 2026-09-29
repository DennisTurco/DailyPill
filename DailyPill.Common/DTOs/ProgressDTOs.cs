namespace DailyPill.Common.DTOs;

public record TopicProgressDTO(
    int TopicId,
    string TopicName,
    int QuestionCount,
    int TotalAnswers,
    int CorrectAnswers,
    double Accuracy,
    double AverageScore);

public record DifficultyProgressDTO(int Difficulty, int TotalAnswers, int CorrectAnswers, double Accuracy);

/// <param name="QuestionsAnswered">Questions answered at least once by the end of this week.</param>
/// <param name="AnswersThisWeek">Graded answers given during this week (all attempts).</param>
/// <param name="Accuracy">Share of those questions whose latest answer was correct; null before any answer.</param>
public record TrendPointDTO(DateTime WeekStart, int QuestionsAnswered, int AnswersThisWeek, double? Accuracy);

public record TopicTrendDTO(int TopicId, string TopicName, List<TrendPointDTO> Points);

public record ProgressTrendDTO(List<TrendPointDTO> Overall, List<TopicTrendDTO> ByTopic);

public record ProgressSummaryDTO(
    int TotalQuizSessions,
    int TotalAnswers,
    double OverallAccuracy,
    int CurrentStreakDays,
    List<TopicProgressDTO> ByTopic,
    List<DifficultyProgressDTO> ByDifficulty,
    List<TopicProgressDTO> WeakestTopics);
