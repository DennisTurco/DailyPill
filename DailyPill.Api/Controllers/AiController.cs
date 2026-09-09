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
    {
        try
        {
            return Ok(await aiService.GenerateQuestionsAsync(dto));
        }
        catch (NotFoundException exc)
        {
            return NotFound(new { detail = exc.Message });
        }
        catch (OllamaUnavailableException exc)
        {
            return StatusCode(503, new { detail = exc.Message });
        }
    }

    [HttpPost("generate-info-facts")]
    public async Task<IActionResult> GenerateInfoFacts([FromBody] AIGenerateInfoFactsRequestDTO dto)
    {
        try
        {
            return Ok(await aiService.GenerateInfoFactsAsync(dto));
        }
        catch (NotFoundException exc)
        {
            return NotFound(new { detail = exc.Message });
        }
        catch (OllamaUnavailableException exc)
        {
            return StatusCode(503, new { detail = exc.Message });
        }
    }
}
