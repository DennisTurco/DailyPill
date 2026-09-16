using DailyPill.Common.DTOs;
using DailyPill.Common.Exceptions;
using DailyPill.Common.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace DailyPill.Api.Controllers;

[ApiController]
[Route("ai")]
public class AiController(IAiService aiService) : ControllerBase
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
}
