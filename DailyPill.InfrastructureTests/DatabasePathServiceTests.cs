using DailyPill.Common.Exceptions;
using DailyPill.Infrastructure.Config;
using DailyPill.Infrastructure.Services;

namespace DailyPill.InfrastructureTests;

public class DatabasePathServiceTests : IDisposable
{
    private readonly string tempDir = Path.Combine(Path.GetTempPath(), $"dailypill-tests-{Guid.NewGuid()}");
    private readonly string defaultDbPath;
    private readonly DatabasePathService service;

    public DatabasePathServiceTests()
    {
        Directory.CreateDirectory(tempDir);
        defaultDbPath = Path.Combine(tempDir, "default.db");
        service = new DatabasePathService(new AppSettings
        {
            DatabasePath = defaultDbPath,
            UserSettings = Path.Combine(tempDir, "settings", "user-settings.json"),
        });
    }

    public void Dispose() => Directory.Delete(tempDir, recursive: true);

    [Fact]
    public void UpdateByPath_ExistingDbFile_IsReturnedByGetCurrentWithFallback()
    {
        var chosen = Path.Combine(tempDir, "chosen.db");
        File.WriteAllText(chosen, "");

        service.UpdateByPath(chosen);

        Assert.Equal(chosen, service.GetCurrentWithFallback().DatabasePath);
    }

    [Fact]
    public void UpdateByPath_MissingFile_ThrowsAndKeepsPreviousPath()
    {
        Assert.Throws<DatabasePathException>(() => service.UpdateByPath(Path.Combine(tempDir, "missing.db")));

        Assert.Equal(defaultDbPath, service.GetCurrentWithFallback().DatabasePath);
    }

    [Fact]
    public void GetCurrentWithFallback_MissingJson_ReturnDefault()
    {
        Assert.Equal(defaultDbPath, service.GetCurrentWithFallback().DatabasePath);
    }

    [Fact]
    public void GetCurrentWithFallback_ShouldGetCustom_WithUppercaseExtensionName()
    {
        var chosen = Path.Combine(tempDir, "chosen.DB");
        File.WriteAllText(chosen, "");

        service.UpdateByPath(chosen);

        Assert.Equal(chosen, service.GetCurrentWithFallback().DatabasePath);
    }

    [Fact]
    public void GetCurrentWithFallback_DatabasePathCustomDoesNotExist_ReturnDefault()
    {
        // creating temp .db file and updating json
        var chosen = Path.Combine(tempDir, "chosen.db");
        File.WriteAllText(chosen, "");
        service.UpdateByPath(chosen);

        // deleting .db file
        File.Delete(service.GetCurrentWithFallback().DatabasePath);

        Assert.Equal(defaultDbPath, service.GetCurrentWithFallback().DatabasePath);
    }

    [Fact]
    public void ResetToDefault_ShouldReset_ForStandardOperation()
    {
        service.ResetToDefault();
        Assert.Equal(defaultDbPath, service.GetCurrentWithFallback().DatabasePath);
    }

    [Fact]
    public void ResetToDefault_ShouldReset_AfterUpdate()
    {
        var chosen = Path.Combine(tempDir, "chosen.db");
        File.WriteAllText(chosen, "");
        service.UpdateByPath(chosen);

        service.ResetToDefault();
        Assert.Equal(defaultDbPath, service.GetCurrentWithFallback().DatabasePath);
    }
}
