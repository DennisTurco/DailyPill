using DailyPill.Common.Enums;

namespace DailyPill.Common.Helpers;

public static class QuestionHelper
{
    public static QuestionType GetQuestionTypeByString(string code)
        => code switch
        {
            "completion" => QuestionType.Completion,
            "multiple_choice" => QuestionType.MultipleChoice,
            "open_answer" => QuestionType.OpenAnswer,
            "single_word" => QuestionType.SingleWord,
            _ => throw new ArgumentException($"The file has an error, the value {code} is unknown")
        };

    public static string GetCodeFromQuestionType(QuestionType type)
        => type switch
        {
            QuestionType.Completion => "completion",
            QuestionType.MultipleChoice => "multiple_choice",
            QuestionType.OpenAnswer => "open_answer",
            QuestionType.SingleWord => "single_word",
            _ => string.Empty
        };
}