namespace DailyPill.Common.DTOs;

/// <param name="Score">Content correctness from 0 (wrong) to 1 (fully correct); language mistakes never affect it.</param>
/// <param name="Feedback">Why the content is right, partially right or wrong.</param>
/// <param name="LanguageFeedback">Grammar/phrasing corrections, or null when the answer is well expressed.</param>
public record OpenAnswerReview(double Score, string? Feedback, string? LanguageFeedback)
{
    /// <summary>Minimum score for an open answer to count as correct in accuracy stats and retries.</summary>
    public const double PassThreshold = 0.6;

    public bool IsCorrect => Score >= PassThreshold;
}
