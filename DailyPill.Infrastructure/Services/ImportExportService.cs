using DailyPill.Common.DTOs;
using DailyPill.Common.Helpers;
using DailyPill.Common.Interfaces;
using YamlDotNet.Core;
using YamlDotNet.Serialization;
using YamlDotNet.Serialization.NamingConventions;

namespace DailyPill.Infrastructure.Services;

public class ImportExportService(
    ITopicService topicService,
    IQuestionService questionService,
    IInfoFactService infoFactService) : IImportExportService
{
    public async Task<int> ImportTopicAndQuestionsAsync(Stream file, string filename)
    {
        if (!filename.EndsWith(".yaml") && !filename.EndsWith(".yml"))
            throw new ArgumentException("Only .yaml documents are allowed");

        using var reader = new StreamReader(file);

        var deserializer = new DeserializerBuilder()
            .WithNamingConvention(UnderscoredNamingConvention.Instance)
            .IgnoreUnmatchedProperties()
            .Build();
        var questions = deserializer.Deserialize<QuestionAndTopicDeserialized>(reader);

        var topic = new TopicRequestDTO(
            questions.Name,
            questions.Category,
            questions.Content,
            null,
            null,
            questions.IsInformational ?? false,
            null
        );

        var existingTopic = await topicService.GetByNameAsync(topic.Name);
        if (existingTopic is not null)
            throw new YamlException("A topic with the same name already exists");

        var created = await topicService.CreateAsync(topic);

        return topic.IsInformational
            ? await PopulateItemsAsync(
                questions.ManualFacts,
                pill => new InfoFactRequestDTO(
                    created.Id,
                    pill.Title,
                    pill.Description,
                    pill.Link
                   ),
                infoFactService.CreateAsync)
            : await PopulateItemsAsync(
                questions.ManualQuestions,
                question => new QuestionRequestDTO(
                    created.Id,
                    new QuestionDictionary().GetType(question.Type),
                    question.Text,
                    question.Options,
                    ResolveCorrectAnswer(question.Options, question.Answer),
                    question.Difficulty,
                    question.Explanation
                   ),
                questionService.CreateAsync);
    }

    public async Task<(string Yaml, string FileName)> ExportTopicAndQuestionsAsync(int topicId)
    {
        var topicAndQuestions = await topicService
            .GetTopicWithQuestionsOrFactsAsync(topicId);

        var deserializedObject = new QuestionAndTopicDeserialized
        {
            Name = topicAndQuestions.Name,
            Category = topicAndQuestions.Category,
            IsInformational = topicAndQuestions.IsInformational
        };

        if (topicAndQuestions.IsInformational && topicAndQuestions.Facts is not null)
            deserializedObject.ManualFacts = ToManualFacts(topicAndQuestions.Facts.Where(f => !f.IsDeleted));
        else if (topicAndQuestions.Questions is not null)
            deserializedObject.ManualQuestions = ToManualQuestions(topicAndQuestions.Questions.Where(q => !q.IsDeleted));

        var yaml = new SerializerBuilder()
            .WithNamingConvention(UnderscoredNamingConvention.Instance)
            .Build()
            .Serialize(deserializedObject);

        return (yaml, deserializedObject.Name);
    }

    private static async Task<int> PopulateItemsAsync<TItem, TRequest>(List<TItem>? items, Func<TItem, TRequest> request, Func<TRequest, Task> create)
    {
        if (items is null) return 0;
        foreach (var item in items)
        {
            var req = request(item);
            await create(req);
        }
        return items.Count;
    }

    private static List<ManualFacts> ToManualFacts(IEnumerable<InfoFactResponseDTO> facts)
        => facts.Select(f => new ManualFacts()
            { 
                Title = f.Title,
                Description = f.Description,
                Link = f.Link
            }
        ).ToList();

    private static List<ManualQuestion> ToManualQuestions(IEnumerable<QuestionResponseDTO> questions)
        => questions.Select(q => new ManualQuestion()
            {
                Type = new QuestionDictionary().GetCode(q.Type),
                Difficulty = q.Difficulty,
                Text = q.Text,
                Options = q.Options,
                Answer = q.CorrectAnswer,
                Explanation = q.Explanation ?? ""
            }
        ).ToList();

    private static string ResolveCorrectAnswer(List<string>? options, string answer)
    {
        // For multiple_choice questions, "answer" is an index into "options"; every other
        // question type (completion/open_answer/single_word) stores the literal answer text.
        if (options is not null && int.TryParse(answer, out var index) && index >= 0 && index < options.Count)
            return options[index];

        return answer;
    }

    private class QuestionAndTopicDeserialized
    {
        public string Name { get; set; } = "";
        public string? Category { get; set; }
        public string? Difficulty { get; set; }
        [YamlMember(Alias = "ai_generate")]
        public bool AIGenerate { get; set; }
        public string? Content { get; set; }
        public bool? IsInformational { get; set; }
        public List<ManualQuestion>? ManualQuestions { get; set; }
        public List<ManualFacts>? ManualFacts { get; set; }
    }

    private class ManualQuestion
    {
        public string Type { get; set; } = "";
        public int Difficulty { get; set; }
        public string Text { get; set; } = "";
        public List<string>? Options { get; set; }
        public string Answer { get; set; } = "";
        public string Explanation { get; set; } = "";
    }

    private class ManualFacts
    {
        public string Title { get; set; } = "";
        public string Description { get; set; } = "";
        public string? Link { get; set; }
    }
}
