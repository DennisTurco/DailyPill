using DailyPill.Common.Interfaces;
using DailyPill.Infrastructure.Config;
using DailyPill.Infrastructure.Data;
using YamlDotNet.Core;

namespace DailyPill.Infrastructure.Services;

public class SeedLoaderService(AppDbContext context, AppSettings settings, IImportExportService importExportService) : ISeedLoaderService
{
    public async Task<int> LoadSeedYamlFilesAsync(string? seedDir = null)
    {
        var dir = seedDir ?? settings.TopicsSeedDir;
        if (!Directory.Exists(dir)) return 0;

        int created = 0;
        foreach (var path in Directory.GetFiles(dir, "*.yaml").OrderBy(p => p, StringComparer.Ordinal))
        {
            var stream = File.OpenRead(path);
            try
            {
                created += await importExportService.ImportTopicAndQuestionsAsync(stream, Path.GetFileName(path));
            }
            catch (YamlException)
            {
                // skip
            }
        }

        await context.SaveChangesAsync();
        return created;
    }
}
