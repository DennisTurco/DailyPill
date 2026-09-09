namespace DailyPill.Common.Interfaces;

public interface ISeedLoaderService
{
    Task<int> LoadSeedYamlFilesAsync(string? seedDir = null);
}
