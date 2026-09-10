using System.Text.Json;
using DailyPill.Common.Interfaces;
using DailyPill.Common.Json;
using DailyPill.Infrastructure.Config;
using DailyPill.Infrastructure.Data;
using DailyPill.Infrastructure.Services;
using DotNetEnv;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// The .env file lives at the repository root, one level above this project's content root
// (mirrors the Python backend's `BACKEND_DIR.parent / ".env"`).
var envPath = Path.Combine(builder.Environment.ContentRootPath, "..", ".env");
if (File.Exists(envPath))
{
    Env.Load(envPath);
}

var appSettings = AppSettings.FromEnvironment();
builder.Services.AddSingleton(appSettings);

var dataDir = Path.Combine(builder.Environment.ContentRootPath, "data");
Directory.CreateDirectory(dataDir);
var dbPath = Path.Combine(dataDir, "dailypill.db");

builder.Services.AddDbContext<AppDbContext>(options => options.UseSqlite($"Data Source={dbPath}"));

builder.Services.AddHttpClient("ollama");
builder.Services.AddSingleton<IGpuService, GpuService>();
builder.Services.AddSingleton<IOllamaService, OllamaService>();

builder.Services.AddScoped<ISeedLoaderService, SeedLoaderService>();
builder.Services.AddScoped<ITopicService, TopicService>();
builder.Services.AddScoped<IQuestionService, QuestionService>();
builder.Services.AddScoped<IQuizService, QuizService>();
builder.Services.AddScoped<IProgressService, ProgressService>();
builder.Services.AddScoped<IInfoFactService, InfoFactService>();
builder.Services.AddScoped<IScheduleService, ScheduleService>();
builder.Services.AddScoped<IAiService, AiService>();
builder.Services.AddScoped<ITopicContextDocumentService, TopicContextDocumentService>();

builder.Services.AddControllers().AddJsonOptions(options =>
{
    options.JsonSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower;
    options.JsonSerializerOptions.Converters.Add(new QuestionTypeJsonConverter());
});

// Mirrors FastAPI's allow_origins=["*"] + allow_credentials=True (not directly expressible
// with ASP.NET Core's AllowAnyOrigin(), which cannot be combined with AllowCredentials()).
builder.Services.AddCors(options =>
    options.AddDefaultPolicy(policy =>
        policy.SetIsOriginAllowed(_ => true).AllowAnyHeader().AllowAnyMethod().AllowCredentials()));

builder.WebHost.UseUrls($"http://localhost:{appSettings.ApiPort}");

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.Migrate();

    var seedLoader = scope.ServiceProvider.GetRequiredService<ISeedLoaderService>();
    await seedLoader.LoadSeedYamlFilesAsync(Path.Combine(builder.Environment.ContentRootPath, appSettings.TopicsSeedDir));
}

var gpuService = app.Services.GetRequiredService<IGpuService>();
app.Logger.LogInformation("NVIDIA GPU detected: {GpuAvailable}", gpuService.DetectNvidiaGpu());

var ollamaService = app.Services.GetRequiredService<IOllamaService>();
ollamaService.Bootstrap();

app.UseCors();
app.MapControllers();
app.MapGet("/health", () => Results.Ok(new { status = "ok", app = appSettings.AppName }));

app.Run();
