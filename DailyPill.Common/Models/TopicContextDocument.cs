using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace DailyPill.Common.Models;

[Table("topic_contexts")]
public class TopicContextDocument
{
    [Key]
    public int Id { get; set; }

    public int TopicId { get; set; }

    [Required]
    public required string Filename { get; set; }

    [Required]
    public required string ExtractedText { get; set; }

    [Required]
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    public Topic? Topic { get; set; }
}
