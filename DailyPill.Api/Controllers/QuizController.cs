using DailyPill.Common.DTOs;
using DailyPill.Common.Exceptions;
using DailyPill.Common.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace DailyPill.Api.Controllers;

[ApiController]
[Route("quiz")]
public class QuizController(IQuizService quizService) : ControllerBase
{
    [HttpPost("start")]
    public async Task<IActionResult> Start([FromBody] QuizStartRequestDTO dto)
    {
        try
        {
            return Ok(await quizService.StartAsync(dto));
        }
        catch (NotFoundException exc)
        {
            return NotFound(new { detail = exc.Message });
        }
    }

    [HttpPost("{sessionId:int}/submit")]
    public async Task<IActionResult> Submit(int sessionId, [FromBody] QuizSubmitRequestDTO dto)
    {
        try
        {
            return Ok(await quizService.SubmitAsync(sessionId, dto));
        }
        catch (NotFoundException exc)
        {
            return NotFound(new { detail = exc.Message });
        }
    }

    [HttpPost("{sessionId:int}/finish")]
    public async Task<IActionResult> Finish(int sessionId)
    {
        try
        {
            return Ok(await quizService.FinishAsync(sessionId));
        }
        catch (NotFoundException exc)
        {
            return NotFound(new { detail = exc.Message });
        }
    }

    [HttpPost("{sessionId:int}/chat")]
    public async Task<IActionResult> Chat(int sessionId, [FromBody] QuizChatRequestDTO dto)
    {
        try
        {
            return Ok(await quizService.ChatAsync(sessionId, dto));
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

    [HttpGet("history")]
    public async Task<IActionResult> History([FromQuery(Name = "topic_id")] int? topicId) =>
        Ok(await quizService.GetHistoryAsync(topicId));

    [HttpGet("{sessionId:int}")]
    public async Task<IActionResult> GetById(int sessionId)
    {
        var session = await quizService.GetByIdAsync(sessionId);
        return session is null ? NotFound(new { detail = "Quiz session not found" }) : Ok(session);
    }
}
