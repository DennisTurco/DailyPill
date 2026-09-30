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

    [Fact]
    public async Task PracticeRetry_ReusesQuestions_AndLatestAnswerDrivesAccuracy()
    {
        await using var context = TestDbContextFactory.Create();
        var (topicId, questionId) = await MakeTopicWithQuestionAsync(context);
        var topicContextDocumentService = new TopicContextDocumentService(context);
        var quizService = new QuizService(context, new FakeOllamaService(), topicContextDocumentService);
        var progressService = new ProgressService(context);

        var first = await quizService.StartAsync(new QuizStartRequestDTO(topicId, 5));
        await quizService.SubmitAsync(first.SessionId, new QuizSubmitRequestDTO([new AnswerSubmitDTO(questionId, "wrong")]));
        await quizService.FinishAsync(first.SessionId);

        var retry = await quizService.StartAsync(new QuizStartRequestDTO(topicId, 5, [questionId]));
        Assert.Equal(questionId, Assert.Single(retry.Questions).Id);
        await quizService.SubmitAsync(retry.SessionId, new QuizSubmitRequestDTO([new AnswerSubmitDTO(questionId, "4")]));
        var finished = await quizService.FinishAsync(retry.SessionId);
        Assert.True(finished.Session.IsPractice);

        var summary = await progressService.GetSummaryAsync();
        var topic = Assert.Single(summary.ByTopic, t => t.TopicId == topicId);
        Assert.Equal(1, topic.TotalAnswers);
        Assert.Equal(1, topic.CorrectAnswers);
        Assert.Equal(1.0, summary.OverallAccuracy);
        Assert.Equal(1, summary.TotalQuizSessions);

        var trend = await progressService.GetTrendAsync(4);
        Assert.Equal(4, trend.Overall.Count);
        Assert.Equal(1.0, trend.Overall[^1].Accuracy);
        Assert.Equal(2, trend.Overall[^1].AnswersThisWeek);
        Assert.Null(trend.Overall[0].Accuracy);
        Assert.Single(trend.ByTopic, t => t.TopicId == topicId);
    }

    [Fact]
    public async Task HintAndConfidence_AreStored_AndHintHalvesScore()
    {
        await using var context = TestDbContextFactory.Create();
        var (topicId, questionId) = await MakeTopicWithQuestionAsync(context);
        var quizService = new QuizService(context, new FakeOllamaService(), new TopicContextDocumentService(context));

        var start = await quizService.StartAsync(new QuizStartRequestDTO(topicId, 5));
        var submitted = await quizService.SubmitAsync(start.SessionId, new QuizSubmitRequestDTO(
            [new AnswerSubmitDTO(questionId, "4", "Guess", HintUsed: true)]));

        var answer = Assert.Single(submitted.Answers);
        Assert.Equal("guess", answer.Confidence);
        Assert.True(answer.HintUsed);
        Assert.Equal(0.5, answer.ScoreAwarded);
    }

    [Theory]
    [InlineData(0.7, false, 0.7, true)]
    [InlineData(0.4, false, 0.4, false)]
    [InlineData(0.7, true, 0.35, true)]
    public async Task OpenAnswer_EarnsPartialScore_FromAiReview(double aiScore, bool hintUsed, double expectedScore, bool expectedCorrect)
    {
        await using var context = TestDbContextFactory.Create();
        var (topicId, _) = await MakeTopicWithQuestionAsync(context);
        var questionService = new QuestionService(context);
        var open = await questionService.CreateAsync(new QuestionRequestDTO(
            topicId, QuestionType.OpenAnswer, "What is idempotency?", null, "Repeating the call has the same effect as doing it once.", 3, null));
        var ollama = new FakeOllamaService { OpenAnswerReview = new OpenAnswerReview(aiScore, "Partly right.", null) };
        var quizService = new QuizService(context, ollama, new TopicContextDocumentService(context));

        var start = await quizService.StartAsync(new QuizStartRequestDTO(topicId, 5, [open.Id]));
        await quizService.SubmitAsync(start.SessionId, new QuizSubmitRequestDTO(
            [new AnswerSubmitDTO(open.Id, "Same result when repeated", HintUsed: hintUsed)]));
        var finished = await quizService.FinishAsync(start.SessionId);

        var answer = Assert.Single(finished.Session.Answers);
        Assert.Equal(expectedScore, answer.ScoreAwarded, 3);
        Assert.Equal(expectedCorrect, answer.IsCorrect);
        Assert.Equal(expectedScore, finished.TotalScore, 3);
    }
}
