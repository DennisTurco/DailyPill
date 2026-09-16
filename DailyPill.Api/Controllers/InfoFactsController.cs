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
        => Ok(await infoFactService.GetDailyAsync());

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
        => Ok(await infoFactService.GetByIdAsync(id));

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] InfoFactRequestDTO dto)
        => Ok(await infoFactService.UpdateAsync(id, dto));

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
        => Ok(await infoFactService.DeleteAsync(id));
}
