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
        => Ok(await topicService.GetByIdAsync(id));

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] TopicRequestDTO dto)
    {
        var created = await topicService.CreateAsync(dto);
        return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] TopicRequestDTO dto)
        => Ok(await topicService.UpdateAsync(id, dto));

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
        => Ok(await topicService.DeleteAsync(id));
}
