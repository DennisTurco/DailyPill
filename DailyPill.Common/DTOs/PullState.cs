namespace DailyPill.Common.DTOs;

public record PullState(bool Pulling, string? Model, string? Status, double? Percent);
