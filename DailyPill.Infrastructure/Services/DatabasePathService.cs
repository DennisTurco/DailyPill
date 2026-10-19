using System.Text.Json;
using DailyPill.Common.DTOs;
using DailyPill.Common.Exceptions;
using DailyPill.Common.Interfaces;
using DailyPill.Infrastructure.Config;

namespace DailyPill.Infrastructure.Services;

public class DatabasePathService(AppSettings appSettings) : IDatabasePathService
{
    private readonly string userSettingsPath = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), appSettings.UserSettings);

    public DatabasePathDTO GetCurrentWithFallback()
    {
        try
        {
            if (!File.Exists(userSettingsPath))
                return new DatabasePathDTO(appSettings.DatabasePath);
            DatabasePathDTO? settings = JsonSerializer.Deserialize<DatabasePathDTO>(File.ReadAllText(userSettingsPath));
            if (!string.IsNullOrWhiteSpace(settings?.DatabasePath) && IsPathOrFileCorrect(settings.DatabasePath))
                return settings;
        }
        catch (JsonException e)
        {
            Console.Error.WriteLine($"Json Deserialization error: {e.Message}");
        }
        catch (IOException e)
        {
            Console.Error.WriteLine($"File error: {e.Message}");
        }
        return new DatabasePathDTO(appSettings.DatabasePath);
    }

    public DatabasePathDTO ResetToDefault()
    {
        CreateDirectoryIfMissing();
        CreateOrUpdateFile(appSettings.DatabasePath);
        return new DatabasePathDTO(appSettings.DatabasePath);
    }

    public DatabasePathDTO UpdateByPath(string path)
    {
        if (!IsPathOrFileCorrect(path))
            throw new DatabasePathException($"File {path} does not exist or it does not have the correct extension");

        CreateDirectoryIfMissing();
        CreateOrUpdateFile(path);

        return new DatabasePathDTO(path);
    }

    private static bool IsPathOrFileCorrect(string path)
        => File.Exists(path) && Path.GetExtension(path).Equals(".db", StringComparison.OrdinalIgnoreCase);

    private void CreateDirectoryIfMissing()
        => Directory.CreateDirectory(Path.GetDirectoryName(userSettingsPath) ?? "DailyPill");

    private void CreateOrUpdateFile(string path)
        => File.WriteAllText(userSettingsPath, JsonSerializer.Serialize(new DatabasePathDTO(path)));
}
