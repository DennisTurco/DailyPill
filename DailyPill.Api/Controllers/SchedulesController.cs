using DailyPill.Common.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace DailyPill.Api.Controllers;

[ApiController]
[Route("schedules")]
public class SchedulesController(IScheduleService scheduleService) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetActive()
        => Ok(await scheduleService.GetActiveAsync());
}
