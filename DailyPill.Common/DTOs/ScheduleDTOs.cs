namespace DailyPill.Common.DTOs;

public record ResolvedScheduleDTO(int TopicId, string TopicName, int DayOfWeek, string TimeOfDay);
