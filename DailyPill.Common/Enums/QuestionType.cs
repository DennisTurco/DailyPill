namespace DailyPill.Common.Enums;

public enum QuestionType
{
    MultipleChoice,
    Completion,
    SingleWord,
    OpenAnswer,
}

public static class QuestionTypeStrings
{
    public static string ToWireString(QuestionType type) => type switch
    {
        QuestionType.MultipleChoice => "multiple_choice",
        QuestionType.Completion => "completion",
        QuestionType.SingleWord => "single_word",
        QuestionType.OpenAnswer => "open_answer",
        _ => throw new ArgumentOutOfRangeException(nameof(type), type, null),
    };

    public static QuestionType FromWireString(string value) => value switch
    {
        "multiple_choice" => QuestionType.MultipleChoice,
        "completion" => QuestionType.Completion,
        "single_word" => QuestionType.SingleWord,
        "open_answer" => QuestionType.OpenAnswer,
        _ => throw new ArgumentOutOfRangeException(nameof(value), value, "Unknown question type"),
    };
}
