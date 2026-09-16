using DailyPill.Common.DTOs;
using DailyPill.Common.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace DailyPill.Api.Controllers;

[ApiController]
[Route("settings")]
public class SettingsController(ISettingsService settingsService) : ControllerBase
{
    /// <summary>
    /// Return all settings
    /// </summary>
    /// <returns>Complete list of settings</returns>
    [HttpGet]
    public async Task<IActionResult> GetAll()
        => Ok(await settingsService.GetAllAsync());

    /// <summary>
    /// Returns a setting by code
    /// </summary>
    /// <param name="code">Setting code</param>
    /// <returns>The requested setting</returns>
    [HttpGet("{code}")]
    public async Task<IActionResult> GetByCode(string code)
        => Ok(await settingsService.GetByCodeAsync(code));

    /// <summary>
    /// Update a setting
    /// </summary>
    /// <param name="code">Setting code</param>
    /// <param name="dto">Setting information</param>
    [HttpPut("{code}")]
    public async Task<IActionResult> Update(string code, [FromBody] SettingsRequestDTO dto)
        => Ok(await settingsService.UpdateAsync(code, dto));
}
