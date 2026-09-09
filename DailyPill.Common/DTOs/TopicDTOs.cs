namespace DailyPill.Common.DTOs;

public record TopicScheduleDTO(int DayOfWeek, TimeSpan TimeOfDay, bool IsActive = true);

public record TopicScheduleResponseDTO(int Id, int TopicId, int DayOfWeek, TimeSpan TimeOfDay, bool IsActive);

public record TopicRequestDTO(
    string Name,
    string? Category,
    string? Description,
    string? Color,
    string? Icon,
    bool IsInformational,
    List<TopicScheduleDTO>? Schedules);

public record TopicResponseDTO(
    int Id,
    string Name,
    string? Category,
    string? Description,
    string? Color,
    string? Icon,
    bool IsInformational,
    DateTime CreatedAt,
    bool IsDeleted,
    List<TopicScheduleResponseDTO> Schedules);
