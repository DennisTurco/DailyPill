using DailyPill.Common.DTOs;
using DailyPill.Common.Enums;
using DailyPill.Infrastructure.Services;

namespace DailyPill.InfrastructureTests;

public class TopicsAndQuestionsTests
{
    [Fact]
    public async Task CreateAndListTopic_NewTopic_AppearsInList()
    {
        await using var context = TestDbContextFactory.Create();
        var service = new TopicService(context);

        var created = await service.CreateAsync(new TopicRequestDTO("Test Topic", null, null, null, null, false, []));
        Assert.Equal("Test Topic", created.Name);

        var all = await service.GetAllAsync();
        Assert.Contains(all, t => t.Id == created.Id);
    }

    [Fact]
    public async Task SoftDeleteTopic_ExcludesFromList()
    {
        await using var context = TestDbContextFactory.Create();
        var service = new TopicService(context);

        var created = await service.CreateAsync(new TopicRequestDTO("To Delete", null, null, null, null, false, []));
        var deleted = await service.DeleteAsync(created.Id);
        Assert.True(deleted);

        var all = await service.GetAllAsync();
        Assert.DoesNotContain(all, t => t.Id == created.Id);
    }

    [Fact]
    public async Task CreateQuestionAndRandomPull_ReturnsExactlyOne_WhenOnlyOneExists()
    {
        await using var context = TestDbContextFactory.Create();
        var topicService = new TopicService(context);
        var questionService = new QuestionService(context);

        var topic = await topicService.CreateAsync(new TopicRequestDTO("Topic", null, null, null, null, false, []));
        await questionService.CreateAsync(new QuestionRequestDTO(
            topic.Id, QuestionType.MultipleChoice, "2+2=?", ["3", "4", "5", "6"], "4", 2, null));

        var random = await questionService.GetRandomAsync(topic.Id, 5);
        Assert.Single(random);
    }

    [Fact]
    public async Task QuestionSoftDelete_NeverHardDeletes()
    {
        await using var context = TestDbContextFactory.Create();
        var topicService = new TopicService(context);
        var questionService = new QuestionService(context);

        var topic = await topicService.CreateAsync(new TopicRequestDTO("Topic", null, null, null, null, false, []));
        var question = await questionService.CreateAsync(new QuestionRequestDTO(
            topic.Id, QuestionType.SingleWord, "word?", null, "answer", 2, null));

        var deleted = await questionService.DeleteAsync(question.Id);
        Assert.True(deleted);

        var fetched = await questionService.GetByIdAsync(question.Id);
        Assert.Null(fetched);
    }

    [Fact]
    public async Task DailyInfoFact_IsIdempotentWithinSameDay()
    {
        await using var context = TestDbContextFactory.Create();
        var topicService = new TopicService(context);
        var infoFactService = new InfoFactService(context);

        var topic = await topicService.CreateAsync(new TopicRequestDTO("Facts Topic", null, null, null, null, true, []));
        await infoFactService.CreateAsync(new InfoFactRequestDTO(topic.Id, "Title", "Description", null));

        var first = await infoFactService.GetDailyAsync();
        var second = await infoFactService.GetDailyAsync();
        Assert.Equal(first.Id, second.Id);
    }
}
