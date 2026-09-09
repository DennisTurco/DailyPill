using DailyPill.Common.Enums;
using DailyPill.Common.Interfaces;
using DailyPill.Common.Models;
using DailyPill.Infrastructure.Config;
using DailyPill.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using YamlDotNet.Serialization;

namespace DailyPill.Infrastructure.Services;

public class SeedLoaderService(AppDbContext context, AppSettings settings) : ISeedLoaderService
{
    private static readonly Dictionary<string, int> DifficultyMap = new()
    {
        ["easy"] = 2,
        ["medium"] = 3,
        ["hard"] = 5,
    };

    public async Task<int> LoadSeedYamlFilesAsync(string? seedDir = null)
    {
        var dir = seedDir ?? settings.TopicsSeedDir;
        if (!Directory.Exists(dir)) return 0;

        var deserializer = new DeserializerBuilder().IgnoreUnmatchedProperties().Build();
        var created = 0;

        foreach (var path in Directory.GetFiles(dir, "*.yaml").OrderBy(p => p, StringComparer.Ordinal))
        {
            using var reader = new StreamReader(path);
            var data = deserializer.Deserialize<Dictionary<object, object>>(reader);
            if (data is null || !TryGetString(data, "name", out var name) || string.IsNullOrEmpty(name))
            {
                continue;
            }

            var topic = await context.Topics.FirstOrDefaultAsync(t => t.Name == name && !t.IsDeleted);
            if (topic is null)
            {
                topic = new Topic
                {
                    Name = name,
                    Category = TryGetString(data, "category", out var cat) ? cat : null,
                    Description = TryGetString(data, "content", out var content) ? content : null,
                    IsInformational = TryGetBool(data, "is_informational", out var infoFlag) && infoFlag,
                };
                context.Topics.Add(topic);
                await context.SaveChangesAsync();
                created++;
            }

            var defaultDifficultyKey = TryGetString(data, "difficulty", out var diffStr) ? diffStr.ToLowerInvariant() : "medium";
            var defaultDifficulty = DifficultyMap.GetValueOrDefault(defaultDifficultyKey, 3);

            if (TryGetList(data, "manual_questions", out var manualQuestions))
            {
                foreach (var raw in manualQuestions)
                {
                    if (raw is not Dictionary<object, object> q) continue;
                    if (!TryGetString(q, "text", out var text) || string.IsNullOrEmpty(text)) continue;

                    var exists = await context.Questions.AnyAsync(existing => existing.TopicId == topic.Id && existing.Text == text);
                    if (exists) continue;

                    var difficulty = TryGetInt(q, "difficulty", out var qDifficulty) ? qDifficulty : defaultDifficulty;
                    var typeStr = TryGetString(q, "type", out var t) ? t : "multiple_choice";
                    var options = TryGetList(q, "options", out var rawOptions)
                        ? rawOptions.Select(o => o?.ToString() ?? "").ToList()
                        : null;

                    string correctAnswer;
                    if (options is not null && TryGetInt(q, "answer", out var answerIndex))
                    {
                        correctAnswer = answerIndex >= 0 && answerIndex < options.Count ? options[answerIndex] : "";
                    }
                    else
                    {
                        correctAnswer = TryGetRaw(q, "answer", out var answerRaw) ? answerRaw?.ToString() ?? "" : "";
                    }

                    context.Questions.Add(new Question
                    {
                        Topic = topic,
                        Type = QuestionTypeStrings.FromWireString(typeStr),
                        Text = text,
                        Options = options,
                        CorrectAnswer = correctAnswer,
                        Difficulty = difficulty,
                        Explanation = TryGetString(q, "explanation", out var expl) ? expl : null,
                    });
                }
            }

            if (TryGetList(data, "manual_facts", out var manualFacts))
            {
                foreach (var raw in manualFacts)
                {
                    if (raw is not Dictionary<object, object> f) continue;
                    if (!TryGetString(f, "title", out var title) || string.IsNullOrEmpty(title)) continue;

                    var exists = await context.InfoFacts.AnyAsync(existing => existing.TopicId == topic.Id && existing.Title == title);
                    if (exists) continue;

                    context.InfoFacts.Add(new InfoFact
                    {
                        Topic = topic,
                        Title = title,
                        Description = TryGetString(f, "description", out var desc) ? desc : "",
                        Link = TryGetString(f, "link", out var link) ? link : null,
                    });
                }
            }
        }

        await context.SaveChangesAsync();
        return created;
    }

    private static bool TryGetRaw(Dictionary<object, object> dict, string key, out object? value)
    {
        foreach (var (k, v) in dict)
        {
            if (k?.ToString() == key)
            {
                value = v;
                return true;
            }
        }
        value = null;
        return false;
    }

    private static bool TryGetString(Dictionary<object, object> dict, string key, out string value)
    {
        if (TryGetRaw(dict, key, out var raw) && raw is not null)
        {
            value = raw.ToString() ?? "";
            return true;
        }
        value = "";
        return false;
    }

    private static bool TryGetBool(Dictionary<object, object> dict, string key, out bool value)
    {
        // YamlDotNet's dynamic Dictionary<object,object> deserialization resolves scalars as
        // strings (not bool/int), so "true"/"false" text needs an explicit parse here.
        if (TryGetRaw(dict, key, out var raw) && raw is not null && bool.TryParse(raw.ToString(), out var parsed))
        {
            value = parsed;
            return true;
        }
        value = false;
        return false;
    }

    private static bool TryGetInt(Dictionary<object, object> dict, string key, out int value)
    {
        if (TryGetRaw(dict, key, out var raw) && raw is not null && int.TryParse(raw.ToString(), out var parsed))
        {
            value = parsed;
            return true;
        }
        value = 0;
        return false;
    }

    private static bool TryGetList(Dictionary<object, object> dict, string key, out List<object> value)
    {
        if (TryGetRaw(dict, key, out var raw) && raw is List<object> list)
        {
            value = list;
            return true;
        }
        value = [];
        return false;
    }
}
