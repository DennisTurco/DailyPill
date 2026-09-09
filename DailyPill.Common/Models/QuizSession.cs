using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace DailyPill.Common.Models;

[Table("quiz_sessions")]
public class QuizSession
{
    [Key]
    public int Id { get; set; }

    [Required]
    public int TopicId { get; set; }

    public DateTime StartedAt { get; set; } = DateTime.UtcNow;

    public DateTime? CompletedAt { get; set; }

    public string? AiReviewSummary { get; set; }

    public Topic? Topic { get; set; }

    public List<UserAnswer> Answers { get; set; } = [];
}
