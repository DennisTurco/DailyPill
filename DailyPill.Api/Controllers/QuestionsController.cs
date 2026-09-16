using DailyPill.Common.DTOs;
using DailyPill.Common.Enums;
using DailyPill.Common.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace DailyPill.Api.Controllers;

[ApiController]
[Route("questions")]
public class QuestionsController(IQuestionService questionService) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery(Name = "topic_id")] int? topicId,
        [FromQuery] int? difficulty,
        [FromQuery] string? type)
    {
        QuestionType? parsedType = null;
        if (type is not null)
        {
            try { parsedType = QuestionTypeStrings.FromWireString(type); } catch { /* ignore invalid filter */ }
        }
        return Ok(await questionService.GetAllAsync(topicId, difficulty, parsedType));
    }

    [HttpGet("random")]
    public async Task<IActionResult> GetRandom([FromQuery(Name = "topic_id")] int topicId, [FromQuery] int count = 10)
    {
        count = Math.Clamp(count, 1, 100);
        return Ok(await questionService.GetRandomAsync(topicId, count));
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
        => Ok(await questionService.GetByIdAsync(id));

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] QuestionRequestDTO dto)
    {
        var created = await questionService.CreateAsync(dto);
        return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] QuestionRequestDTO dto)
        => Ok(await questionService.UpdateAsync(id, dto));

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
        => Ok(await questionService.DeleteAsync(id));
}
