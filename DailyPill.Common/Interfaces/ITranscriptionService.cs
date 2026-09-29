using DailyPill.Common.DTOs;

namespace DailyPill.Common.Interfaces;

public interface ITranscriptionService
{
    TranscriptionStatusResponseDTO GetStatus();

    /// <summary>Fire-and-forget: downloads the configured Whisper model if missing and loads it.</summary>
    void Bootstrap();

    /// <summary>
    /// Transcribes a 16 kHz mono PCM WAV stream. <paramref name="prompt"/> (e.g. the question text)
    /// biases Whisper toward the technical vocabulary the answer is likely to contain.
    /// </summary>
    Task<string> TranscribeAsync(Stream wavStream, string? prompt, CancellationToken ct = default);
}
