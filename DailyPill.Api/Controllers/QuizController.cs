using DailyPill.Common.DTOs;
using DailyPill.Common.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace DailyPill.Api.Controllers;

[ApiController]
[Route("quiz")]
public class QuizController(IQuizService quizService) : ControllerBase
{
    [HttpPost("start")]
    public async Task<IActionResult> Start([FromBody] QuizStartRequestDTO dto)
        => Ok(await quizService.StartAsync(dto));

    [HttpPost("{sessionId:int}/submit")]
    public async Task<IActionResult> Submit(int sessionId, [FromBody] QuizSubmitRequestDTO dto)
        => Ok(await quizService.SubmitAsync(sessionId, dto));

    [HttpPost("{sessionId:int}/finish")]
    public async Task<IActionResult> Finish(int sessionId)
        => Ok(await quizService.FinishAsync(sessionId));

    [HttpPost("{sessionId:int}/chat")]
    public async Task<IActionResult> Chat(int sessionId, [FromBody] QuizChatRequestDTO dto)
        => Ok(await quizService.ChatAsync(sessionId, dto));

    [HttpPost("{sessionId:int}/hint")]
    public async Task<IActionResult> Hint(int sessionId, [FromBody] QuizHintRequestDTO dto)
        => Ok(await quizService.HintAsync(sessionId, dto));

    [HttpGet("history")]
    public async Task<IActionResult> History([FromQuery(Name = "topic_id")] int? topicId)
        => Ok(await quizService.GetHistoryAsync(topicId));

    [HttpGet("{sessionId:int}")]
    public async Task<IActionResult> GetById(int sessionId)
        => Ok(await quizService.GetByIdAsync(sessionId));
}
