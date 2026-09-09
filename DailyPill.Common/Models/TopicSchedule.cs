using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace DailyPill.Common.Models;

[Table("topic_schedules")]
public class TopicSchedule
{
    [Key]
    public int Id { get; set; }

    [Required]
    public int TopicId { get; set; }

    public int DayOfWeek { get; set; }

    public TimeSpan TimeOfDay { get; set; }

    public bool IsActive { get; set; } = true;

    public Topic? Topic { get; set; }
}
