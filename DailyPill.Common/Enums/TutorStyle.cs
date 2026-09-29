namespace DailyPill.Common.Enums;

/// <summary>Tone of the AI tutor's feedback, recap and chat. Grading criteria never depend on it.</summary>
public enum TutorStyle
{
    Friendly,
    Professional,
    Strict,
    Socratic,
    Interviewer,
}

public static class TutorStyles
{
    public const string SettingCode = "TutorStyle";
    public const TutorStyle Default = TutorStyle.Friendly;

    /// <summary>Parses the stored setting value ("friendly", "strict", ...); unknown or empty values fall back to the default.</summary>
    public static TutorStyle Parse(string? value)
        => IsValid(value) ? Enum.Parse<TutorStyle>(value!, ignoreCase: true) : Default;

    /// <summary>Only style names are valid: Enum.TryParse would also accept numbers like "2".</summary>
    public static bool IsValid(string? value)
        => !string.IsNullOrWhiteSpace(value) && !int.TryParse(value, out _) && Enum.TryParse<TutorStyle>(value, ignoreCase: true, out _);

    /// <summary>Instruction appended to every tutor prompt to set its voice.</summary>
    public static string ToneInstruction(TutorStyle style) => style switch
    {
        TutorStyle.Friendly =>
            "Tone: warm, encouraging and positive, like a supportive tutor; celebrate what the student got right.",
        TutorStyle.Professional =>
            "Tone: neutral, precise and professional, like a senior colleague; no small talk, no exclamation marks.",
        TutorStyle.Strict =>
            "Tone: direct and demanding, like an exacting teacher; point out every weakness plainly and skip compliments " +
            "unless they are fully earned, while staying respectful.",
        TutorStyle.Socratic =>
            "Tone: Socratic; instead of simply stating what is wrong, guide the student with hints and a short question " +
            "that makes them reason toward the right idea, then confirm the key point.",
        TutorStyle.Interviewer =>
            "Tone: like an experienced technical interviewer; be concise and professional, say how the answer would land " +
            "in a real interview, and when useful end with one follow-up question an interviewer would ask.",
        _ => throw new ArgumentOutOfRangeException(nameof(style), style, null),
    };
}
