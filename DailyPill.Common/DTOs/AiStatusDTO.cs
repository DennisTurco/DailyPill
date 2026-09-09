namespace DailyPill.Common.DTOs;

public record AiStatusResponseDTO(
    bool Available,
    string Model,
    string BaseUrl,
    bool GpuAvailable,
    bool PullingModel,
    string? PullStatus,
    double? PullPercent);
