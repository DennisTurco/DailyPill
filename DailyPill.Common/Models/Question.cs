using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using DailyPill.Common.Enums;

namespace DailyPill.Common.Models;

[Table("questions")]
public class Question
{
    [Key]
    public int Id { get; set; }

    [Required]
    public int TopicId { get; set; }

    [Required]
    public QuestionType Type { get; set; }

    [Required]
    public string Text { get; set; } = string.Empty;

    public List<string>? Options { get; set; }

    [Required]
    public string CorrectAnswer { get; set; } = string.Empty;

    public int Difficulty { get; set; } = 3;

    public string? Explanation { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public bool IsDeleted { get; set; }

    public DateTime? DeletedAt { get; set; }

    public Topic? Topic { get; set; }

    public List<UserAnswer> Answers { get; set; } = [];
}
