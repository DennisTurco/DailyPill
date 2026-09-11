namespace DailyPill.Common.DTOs;

public record SettingsResponseDTO(
    string Code,
    string? Value,
    string? Description,
    DateTimeOffset? LastUpdateDate
);
