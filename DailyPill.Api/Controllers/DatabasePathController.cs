using DailyPill.Common.DTOs;
using DailyPill.Common.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace DailyPill.Api.Controllers;

[ApiController]
[Route("database-path")]
public class DatabasePathController(IDatabasePathService databasePathService) : ControllerBase
{
    [HttpGet]
    public IActionResult GetCurrentWithFallback()
        => Ok(databasePathService.GetCurrentWithFallback());


    [HttpPut("update")]
    public IActionResult UpdateByPath([FromBody] DatabasePathRequestDTO dto)
        => Ok(databasePathService.UpdateByPath(dto.Path));

    [HttpPut("reset")]
    public IActionResult ResetToDefault()
        => Ok(databasePathService.ResetToDefault());
}
