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

    public DateTime AnsweredAt { get; set; } = DateTime.UtcNow;

    public QuizSession? QuizSession { get; set; }

    public Question? Question { get; set; }
}
