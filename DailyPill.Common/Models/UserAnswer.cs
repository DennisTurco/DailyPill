using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace DailyPill.Common.Models;

[Table("user_answers")]
public class UserAnswer
{
    [Key]
    public int Id { get; set; }

    [Required]
    public int QuizSessionId { get; set; }

    [Required]
    public int QuestionId { get; set; }

    [Required]
    public string GivenAnswer { get; set; } = string.Empty;

    /// <summary>Null means "not yet graded" — used for open_answer questions pending AI review.</summary>
    public bool? IsCorrect { get; set; }

    public double ScoreAwarded { get; set; }

    public string? AiFeedback { get; set; }

    /// <summary>Grammar/phrasing notes on an open answer, independent of whether it was correct.</summary>
    public string? LanguageFeedback { get; set; }

    /// <summary>Self-reported certainty: "sure", "unsure" or "guess" (see AnswerConfidences); null when not given.</summary>
    public string? Confidence { get; set; }

    /// <summary>The user asked for an AI hint before answering; a correct answer then earns reduced score.</summary>
    public bool HintUsed { get; set; }

    public DateTime AnsweredAt { get; set; } = DateTime.UtcNow;

    public QuizSession? QuizSession { get; set; }

    public Question? Question { get; set; }
}
