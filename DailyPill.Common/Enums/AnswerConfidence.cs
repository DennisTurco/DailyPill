namespace DailyPill.Common.Enums;

/// <summary>Wire/storage values for how sure the user was of an answer.</summary>
public static class AnswerConfidences
{
    public const string Sure = "sure";
    public const string Unsure = "unsure";
    public const string Guess = "guess";

    /// <summary>Returns the value if it's a known confidence level, null otherwise.</summary>
    public static string? Normalize(string? value)
    {
        var normalized = value?.Trim().ToLowerInvariant();
        return normalized is Sure or Unsure or Guess ? normalized : null;
    }
}
