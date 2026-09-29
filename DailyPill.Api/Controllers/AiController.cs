using DailyPill.Common.DTOs;
using DailyPill.Common.Exceptions;
using DailyPill.Common.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace DailyPill.Api.Controllers;

[ApiController]
[Route("ai")]
public class AiController(IAiService aiService, ITranscriptionService transcriptionService) : ControllerBase
{
    [HttpGet("status")]
    public IActionResult Status()
        => Ok(aiService.GetStatus());

    [HttpPost("generate-questions")]
    public async Task<IActionResult> GenerateQuestions([FromBody] AIGenerateQuestionsRequestDTO dto)
        => Ok(await aiService.GenerateQuestionsAsync(dto));

    [HttpPost("generate-info-facts")]
    public async Task<IActionResult> GenerateInfoFacts([FromBody] AIGenerateInfoFactsRequestDTO dto)
        => Ok(await aiService.GenerateInfoFactsAsync(dto));

    [HttpGet("transcription-status")]
    public IActionResult TranscriptionStatus()
        => Ok(transcriptionService.GetStatus());

    /// <summary>Transcribes a recorded voice answer (16 kHz mono WAV); <paramref name="prompt"/> is usually the question text.</summary>
    [HttpPost("transcribe")]
    public async Task<IActionResult> Transcribe(IFormFile audio, [FromForm] string? prompt, CancellationToken ct)
    {
        await using var stream = audio.OpenReadStream();
        var text = await transcriptionService.TranscribeAsync(stream, prompt, ct);
        return Ok(new TranscriptionResponseDTO(text));
    }
}
