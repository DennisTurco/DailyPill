namespace DailyPill.Common.DTOs;

public record TranscriptionStatusResponseDTO(
    bool Enabled,
    bool Ready,
    string Model,
    bool Downloading,
    string? Status);

public record TranscriptionResponseDTO(string Text);
