using System.Collections.Frozen;
using DailyPill.Common.Enums;

namespace DailyPill.Common.Helpers;

public class QuestionDictionary
{
    public FrozenDictionary<QuestionType, string> QuestionTypeDict =
        new Dictionary<QuestionType, string>
        {
            { QuestionType.Completion, "completion" },
            { QuestionType.MultipleChoice, "multiple_choice" },
            { QuestionType.OpenAnswer, "open_answer" },
            { QuestionType.SingleWord, "single_word" }
        }.ToFrozenDictionary();

    public QuestionType GetType(string code)
    {
        var type = QuestionTypeDict.FirstOrDefault(q => q.Value == code);
        return type.Value is not null ? type.Key : throw new ArgumentException($"The file has an error, the value {code} is unknown");
    }

    public string GetCode(QuestionType type)
        => QuestionTypeDict.GetValueOrDefault(type) ?? string.Empty;

}