namespace DailyPill.Common.DTOs;

/// <param name="Score">Score awarded from 0 to 1 (partial for open answers, halved when a hint was used).</param>
public record QuizResultLine(string Text, string GivenAnswer, string CorrectAnswer, bool? IsCorrect, double Score, string? Confidence = null, bool HintUsed = false);
