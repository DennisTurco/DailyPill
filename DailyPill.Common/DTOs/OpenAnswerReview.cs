namespace DailyPill.Common.DTOs;

/// <param name="IsCorrect">Content correctness only; language mistakes never affect it.</param>
/// <param name="Feedback">Why the content is right or wrong.</param>
/// <param name="LanguageFeedback">Grammar/phrasing corrections, or null when the answer is well expressed.</param>
public record OpenAnswerReview(bool IsCorrect, string? Feedback, string? LanguageFeedback);
