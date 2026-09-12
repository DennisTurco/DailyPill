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
            ? await PopulatePills(created.Id, questions.ManualFacts)
            : await PopulateQuestions(created.Id, questions.ManualQuestions);
    }

    public async Task<(string? Yaml, string? FileName)> ExportTopicAndQuestionsAsync(int topicId)
    {
        var topicAndQuestions = await topicService.GetTopicWithQuestionsOrFactsAsync(topicId);

        if (topicAndQuestions is null)
            return (null, null);

        var deserializedObject = new QuestionAndTopicDeserialized
        {
            Name = topicAndQuestions.Name,
            Category = topicAndQuestions.Category,
            IsInformational = topicAndQuestions.IsInformational
        };

        if (topicAndQuestions.IsInformational && topicAndQuestions.Facts is not null)
            deserializedObject.ManualFacts = ToManualFacts(topicAndQuestions.Facts.Where(f => !f.IsDeleted).ToList());
        else if (topicAndQuestions.Questions is not null)
            deserializedObject.ManualQuestions = ToManualQuestions(topicAndQuestions.Questions.Where(q => !q.IsDeleted).ToList());
        else
            return (null, null);

        var yaml = new SerializerBuilder()
            .WithNamingConvention(UnderscoredNamingConvention.Instance)
            .Build()
            .Serialize(deserializedObject);

        return (yaml, deserializedObject.Name);
    }

    private async Task<int> PopulateQuestions(int topicId, List<ManualQuestion>? questions)
    {
        if (questions is null) return 0;

        foreach (var question in questions)
        {
            var questionRequest = new QuestionRequestDTO(
                topicId,
                QuestionHelper.GetQuestionTypeByString(question.Type),
                question.Text,
                question.Options,
                ResolveCorrectAnswer(question.Options, question.Answer),
                question.Difficulty,
                question.Explanation
            );
            await questionService.CreateAsync(questionRequest);
        }
        return questions.Count;
    }

    private async Task<int> PopulatePills(int topicId, List<ManualFacts>? pills)
    {
        if (pills is null) return 0;

        foreach (var pill in pills)
        {
            var pillRequest = new InfoFactRequestDTO(topicId, pill.Title, pill.Description, pill.Link);
            await infoFactService.CreateAsync(pillRequest);
        }
        return pills.Count;
    }

    private static List<ManualFacts> ToManualFacts(List<InfoFactResponseDTO> facts)
    {
        List<ManualFacts> manualFacts = new List<ManualFacts>();
        foreach (var fact in facts)
        {
            var manualFact = new ManualFacts()
            {
                Title = fact.Title,
                Description = fact.Description,
                Link = fact.Link
            };
            manualFacts.Add(manualFact);
        }
        return manualFacts;
    }

    private static List<ManualQuestion> ToManualQuestions(List<QuestionResponseDTO> questions)
    {
        List<ManualQuestion> manualQuestions = new List<ManualQuestion>();
        foreach (var question in questions)
        {
            var manualQuestion = new ManualQuestion()
            {
                Type = QuestionHelper.GetCodeFromQuestionType(question.Type),
                Difficulty = question.Difficulty,
                Text = question.Text,
                Options = question.Options,
                Answer = question.CorrectAnswer,
                Explanation = question.Explanation ?? ""
            };
            manualQuestions.Add(manualQuestion);
        }
        return manualQuestions;
    }

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
