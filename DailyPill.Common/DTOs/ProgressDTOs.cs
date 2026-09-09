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

public record ProgressSummaryDTO(
    int TotalQuizSessions,
    int TotalAnswers,
    double OverallAccuracy,
    int CurrentStreakDays,
    List<TopicProgressDTO> ByTopic,
    List<DifficultyProgressDTO> ByDifficulty,
    List<TopicProgressDTO> WeakestTopics);
