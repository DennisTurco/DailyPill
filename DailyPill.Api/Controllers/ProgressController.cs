using DailyPill.Common.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace DailyPill.Api.Controllers;

[ApiController]
[Route("progress")]
public class ProgressController(IProgressService progressService) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Get()
        => Ok(await progressService.GetSummaryAsync());

    [HttpGet("trend")]
    public async Task<IActionResult> Trend([FromQuery] int weeks = 12)
        => Ok(await progressService.GetTrendAsync(weeks));
}
