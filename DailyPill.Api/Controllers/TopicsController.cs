using DailyPill.Common.DTOs;
using DailyPill.Common.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace DailyPill.Api.Controllers;

[ApiController]
[Route("topics")]
public class TopicsController(ITopicService topicService) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll()
        => Ok(await topicService.GetAllAsync());

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var topic = await topicService.GetByIdAsync(id);
        return topic is null ? NotFound(new { detail = "Topic not found" }) : Ok(topic);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] TopicRequestDTO dto)
    {
        var created = await topicService.CreateAsync(dto);
        return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] TopicRequestDTO dto)
    {
        var updated = await topicService.UpdateAsync(id, dto);
        return updated is null ? NotFound(new { detail = "Topic not found" }) : Ok(updated);
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var deleted = await topicService.DeleteAsync(id);
        return deleted ? NoContent() : NotFound(new { detail = "Topic not found" });
    }
}
