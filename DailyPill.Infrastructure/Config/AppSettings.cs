namespace DailyPill.Infrastructure.Config;

/// <summary>
/// Mirrors the Python backend's Settings (config.py): read from the root .env file
/// (loaded via DotNetEnv at startup) with the same field names/defaults, so the
/// existing .env keeps working unmodified.
/// </summary>
public class AppSettings
{
    public string AppName { get; init; } = "DailyPill";
    public int ApiPort { get; init; } = 8420;

    /// <summary>Path to the SQLite file, relative to the API content root.</summary>
    public string DatabasePath { get; init; } = "data/dailypill.db";

    public string OllamaBaseUrl { get; init; } = "http://localhost:11434";
    public string OllamaModel { get; init; } = "llama3.1";
    public int OllamaTimeoutSeconds { get; init; } = 60;

    /// <summary>Path to the topics/*.yaml seed directory, relative to the API content root.</summary>
    public string TopicsSeedDir { get; init; } = "../topics";

    public static AppSettings FromEnvironment()
    {
        return new AppSettings
        {
            AppName = Environment.GetEnvironmentVariable("APP_NAME") ?? "DailyPill",
            ApiPort = int.TryParse(Environment.GetEnvironmentVariable("API_PORT"), out var port) ? port : 8420,
            DatabasePath = "data/dailypill.db",
            OllamaBaseUrl = Environment.GetEnvironmentVariable("OLLAMA_BASE_URL") ?? "http://localhost:11434",
            OllamaModel = Environment.GetEnvironmentVariable("OLLAMA_MODEL") ?? "llama3.1",
            OllamaTimeoutSeconds = int.TryParse(Environment.GetEnvironmentVariable("OLLAMA_TIMEOUT_SECONDS"), out var t) ? t : 60,
            TopicsSeedDir = "../topics",
        };
    }
}
