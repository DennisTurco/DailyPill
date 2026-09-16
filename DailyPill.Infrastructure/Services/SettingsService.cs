using DailyPill.Common.DTOs;
using DailyPill.Common.Exceptions;
using DailyPill.Common.Interfaces;
using DailyPill.Common.Models;
using DailyPill.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace DailyPill.Infrastructure.Services;

public class SettingsService(AppDbContext context) : ISettingsService
{
    public async Task<List<SettingsResponseDTO>> GetAllAsync()
        => await context.Settings
            .AsNoTracking()
            .Select(s => MapToDto(s))
            .ToListAsync();

    public async Task<SettingsResponseDTO?> GetByCodeAsync(string code)
    {
        var setting = await context.Settings
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.Code.Equals(code))
            ?? throw new NotFoundException("Setting not found");

        return MapToDto(setting);
    }

    public async Task<SettingsResponseDTO> UpdateAsync(string code, SettingsRequestDTO dto)
    {
        var setting = await context.Settings
            .FirstOrDefaultAsync(s => s.Code == code)
            ?? throw new NotFoundException("Setting not found");

        setting.Value = dto.Value;
        setting.LastUpdateDate = DateTime.UtcNow;

        await context.SaveChangesAsync();

        return MapToDto(setting);
    }

    private static SettingsResponseDTO MapToDto(Settings s)
        => new(
            s.Code,
            s.Value,
            s.Description,
            s.LastUpdateDate
        );
}
