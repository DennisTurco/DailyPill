using DailyPill.Common.DTOs;
using DailyPill.Common.Exceptions;
using DailyPill.Common.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace DailyPill.Api.Controllers;

[ApiController]
[Route("info-facts")]
public class InfoFactsController(IInfoFactService infoFactService) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery(Name = "topic_id")] int? topicId)
        => Ok(await infoFactService.GetAllAsync(topicId));

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] InfoFactRequestDTO dto)
    {
        var created = await infoFactService.CreateAsync(dto);
        return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
    }

    [HttpGet("daily")]
    public async Task<IActionResult> GetDaily()
    {
        try
        {
            return Ok(await infoFactService.GetDailyAsync());
        }
        catch (NotFoundException exc)
        {
            return NotFound(new { detail = exc.Message });
        }
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var fact = await infoFactService.GetByIdAsync(id);
        return fact is null ? NotFound(new { detail = "Info fact not found" }) : Ok(fact);
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] InfoFactRequestDTO dto)
    {
        var updated = await infoFactService.UpdateAsync(id, dto);
        return updated is null ? NotFound(new { detail = "Info fact not found" }) : Ok(updated);
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var deleted = await infoFactService.DeleteAsync(id);
        return deleted ? NoContent() : NotFound(new { detail = "Info fact not found" });
    }
}
