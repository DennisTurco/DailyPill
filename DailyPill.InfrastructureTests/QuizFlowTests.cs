using DailyPill.Common.DTOs;
using DailyPill.Common.Enums;
using DailyPill.Infrastructure.Data;
using DailyPill.Infrastructure.Services;

namespace DailyPill.InfrastructureTests;

public class QuizFlowTests
{
    private static async Task<(int TopicId, int QuestionId)> MakeTopicWithQuestionAsync(AppDbContext context)
    {
        var topicContextService = new TopicContextDocumentService(context);
        var questionService = new QuestionService(context);
        var infoFactService = new InfoFactService(context);
        var topicService = new TopicService(context, topicContextService, questionService, infoFactService);

        var topic = await topicService.CreateAsync(new TopicRequestDTO("Quiz Topic", null, null, null, null, false, []));
        var question = await questionService.CreateAsync(new QuestionRequestDTO(
            topic.Id, QuestionType.MultipleChoice, "2+2=?", ["3", "4", "5", "6"], "4", 2, null));
        return (topic.Id, question.Id);
    }

    [Fact]
    public async Task QuizStartSubmitFinish_FullLifecycle_WorksWithoutOllama()
    {
        await using var context = TestDbContextFactory.Create();
        var (topicId, questionId) = await MakeTopicWithQuestionAsync(context);
        var topicContextDocumentService = new TopicContextDocumentService(context);
        var quizService = new QuizService(context, new FakeOllamaService(), topicContextDocumentService);

        var start = await quizService.StartAsync(new QuizStartRequestDTO(topicId, 5));
        Assert.Single(start.Questions);

        var submitted = await quizService.SubmitAsync(start.SessionId, new QuizSubmitRequestDTO(
            [new AnswerSubmitDTO(questionId, "4")]));
        Assert.True(submitted.Answers[0].IsCorrect);

        var finished = await quizService.FinishAsync(start.SessionId);
        Assert.Equal(1.0, finished.TotalScore);
        Assert.NotNull(finished.Session.CompletedAt);
    }

    [Fact]
    public async Task ProgressEndpoint_ReturnsSummary_AfterWrongAnswer()
    {
        await using var context = TestDbContextFactory.Create();
        var (topicId, questionId) = await MakeTopicWithQuestionAsync(context);
        var topicContextDocumentService = new TopicContextDocumentService(context);
        var quizService = new QuizService(context, new FakeOllamaService(), topicContextDocumentService);
        var progressService = new ProgressService(context);

        var start = await quizService.StartAsync(new QuizStartRequestDTO(topicId, 5));
        await quizService.SubmitAsync(start.SessionId, new QuizSubmitRequestDTO(
            [new AnswerSubmitDTO(questionId, "wrong")]));
        await quizService.FinishAsync(start.SessionId);

        var summary = await progressService.GetSummaryAsync();
        Assert.True(summary.TotalAnswers >= 1);
        Assert.Contains(summary.ByTopic, t => t.TopicId == topicId);
    }
}
