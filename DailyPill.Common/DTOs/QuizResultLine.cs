namespace DailyPill.Common.DTOs;

public record QuizResultLine(string Text, string GivenAnswer, string CorrectAnswer, bool? IsCorrect);
