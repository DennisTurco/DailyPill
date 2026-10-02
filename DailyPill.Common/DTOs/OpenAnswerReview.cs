namespace DailyPill.Common.DTOs;

/// <param name="Score">Content correctness from 0 (wrong) to 1 (fully correct); language mistakes never affect it.</param>
/// <param name="Feedback">Why the content is right, partially right or wrong.</param>
/// <param name="LanguageFeedback">Grammar/phrasing corrections, or null when the answer is well expressed.</param>
public record OpenAnswerReview(double Score, string? Feedback, string? LanguageFeedback)
{
    /// <summary>Minimum score for an open answer to count as correct in accuracy stats and retries.</summary>
    public const double PassThreshold = 0.6;

    /// <summary>
    /// Open answers scored in [FollowUpMinScore, 1) are incomplete rather than wrong, so the tutor can ask a
    /// follow-up question to check whether the missing ideas are actually known. Below this the answer is
    /// mostly wrong and a follow-up would just be a second attempt at the question.
    /// </summary>
    public const double FollowUpMinScore = 0.3;

    public bool IsCorrect => Score >= PassThreshold;
}

/// <param name="Score">Correctness from 0 to 1 judged on the original answer and the follow-up answer together.</param>
/// <param name="Feedback">What the follow-up answer recovered and what is still missing.</param>
public record FollowUpReview(double Score, string? Feedback);
