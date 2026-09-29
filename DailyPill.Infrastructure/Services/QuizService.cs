using DailyPill.Common.DTOs;
using DailyPill.Common.Enums;
using DailyPill.Common.Exceptions;
using DailyPill.Common.Interfaces;
using DailyPill.Common.Models;
using DailyPill.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace DailyPill.Infrastructure.Services;

public class QuizService(AppDbContext context, IOllamaService ollamaService, ITopicContextDocumentService topicContextDocumentService) : IQuizService
{
    private static string Normalize(string text) => string.Join(" ", text.Trim().ToLowerInvariant().Split(
        (char[]?)null, StringSplitOptions.RemoveEmptyEntries));

    private async Task<TutorStyle> GetTutorStyleAsync()
    {
        var value = await context.Settings
            .AsNoTracking()
            .Where(s => s.Code == TutorStyles.SettingCode)
            .Select(s => s.Value)
            .FirstOrDefaultAsync();
        return TutorStyles.Parse(value);
    }

    private static bool GradeObjective(Question question, string givenAnswer) =>
        Normalize(givenAnswer) == Normalize(question.CorrectAnswer);

    /// <summary>Score for a graded answer: getting it right with a hint earns half credit.</summary>
    private static double Score(bool isCorrect, bool hintUsed) => !isCorrect ? 0.0 : hintUsed ? 0.5 : 1.0;

    private static List<QuizResultLine> BuildResults(List<UserAnswer> answers) => answers.Select(a => new QuizResultLine(
        a.Question?.Text ?? "",
        a.GivenAnswer,
        a.Question?.CorrectAnswer ?? "",
        a.IsCorrect,
        a.Confidence,
        a.HintUsed)).ToList();

    public async Task<QuizStartResponseDTO> StartAsync(QuizStartRequestDTO dto)
    {
        var questionCount = Math.Clamp(dto.QuestionCount, 1, 50);
        var aiAvailable = ollamaService.IsAvailable();
        var isPractice = dto.QuestionIds is { Count: > 0 };

        var query = context.Questions
            .AsNoTracking()
            .Where(q => q.TopicId == dto.TopicId && !q.IsDeleted);
        if (isPractice) query = query.Where(q => dto.QuestionIds!.Contains(q.Id));
        var candidates = await query.Include(q => q.Answers).ToListAsync();

        if (!aiAvailable)
        {
            candidates = candidates.Where(q => q.Type != QuestionType.OpenAnswer).ToList();
        }
        if (candidates.Count == 0)
        {
            throw new NotFoundException("No questions available for this topic");
        }

        var shuffled = candidates.OrderBy(_ => Random.Shared.Next()).ToList();

        var selected = isPractice
            ? shuffled
            : shuffled.Count >= questionCount
                ? GetRandomQuestionsWithMixedDifficulty(shuffled, questionCount)
                : shuffled.Take(questionCount).ToList();
        selected = selected.OrderBy(q => q.Difficulty).ToList();

        var session = new QuizSession { TopicId = dto.TopicId, IsPractice = isPractice };
        context.QuizSessions.Add(session);
        await context.SaveChangesAsync();

        var questions = selected.Select(q => QuestionService.ShuffleOptions(QuestionService.MapToDto(q))).ToList();
        return new QuizStartResponseDTO(session.Id, dto.TopicId, questions, aiAvailable);
    }

    public async Task<QuizSessionResponseDTO> SubmitAsync(int sessionId, QuizSubmitRequestDTO dto)
    {
        var session = await context.QuizSessions
            .FirstOrDefaultAsync(s => s.Id == sessionId)
            ?? throw new NotFoundException("Quiz session not found");

        foreach (var answer in dto.Answers)
        {
            var question = await context.Questions.FirstOrDefaultAsync(q => q.Id == answer.QuestionId);
            if (question is null) continue;

            var isOpen = question.Type == QuestionType.OpenAnswer;
            bool? isCorrect = isOpen ? null : GradeObjective(question, answer.GivenAnswer);

            context.UserAnswers.Add(new UserAnswer
            {
                QuizSessionId = sessionId,
                QuestionId = question.Id,
                GivenAnswer = answer.GivenAnswer,
                IsCorrect = isCorrect,
                ScoreAwarded = Score(isCorrect == true, answer.HintUsed),
                Confidence = AnswerConfidences.Normalize(answer.Confidence),
                HintUsed = answer.HintUsed,
            });
        }

        await context.SaveChangesAsync();
        return await GetSessionDtoAsync(sessionId) ?? throw new NotFoundException("Quiz session not found");
    }

    public async Task<QuizFinishResponseDTO> FinishAsync(int sessionId)
    {
        var session = await context.QuizSessions
            .Include(s => s.Topic)
            .FirstOrDefaultAsync(s => s.Id == sessionId)
            ?? throw new NotFoundException("Quiz session not found");

        var contextDocuments = await topicContextDocumentService.GetAllContextByTopicIdAsync(session.TopicId);

        var answers = await context.UserAnswers
            .Include(a => a.Question)
            .Where(a => a.QuizSessionId == sessionId)
            .ToListAsync();

        var topicName = session.Topic?.Name ?? "Unknown";
        var tutorStyle = await GetTutorStyleAsync();

        foreach (var answer in answers)
        {
            var question = answer.Question;
            if (question is null || question.Type != QuestionType.OpenAnswer || answer.IsCorrect is not null) continue;

            if (string.IsNullOrWhiteSpace(answer.GivenAnswer))
            {
                answer.IsCorrect = false;
                answer.ScoreAwarded = 0.0;
                answer.AiFeedback = "No answer given.";
                continue;
            }

            try
            {
                var review = await ollamaService.ReviewOpenAnswerAsync(question.Text, question.CorrectAnswer, answer.GivenAnswer, contextDocuments, tutorStyle);
                answer.IsCorrect = review.IsCorrect;
                answer.ScoreAwarded = Score(review.IsCorrect, answer.HintUsed);
                answer.AiFeedback = review.Feedback;
                answer.LanguageFeedback = review.LanguageFeedback;
            }
            catch (OllamaUnavailableException)
            {
                answer.AiFeedback = "AI review unavailable (Ollama unreachable); please self-grade.";
            }
        }
        await context.SaveChangesAsync();

        var results = BuildResults(answers);
        string recap;
        try
        {
            recap = await ollamaService.GenerateQuizRecapAsync(topicName, results, contextDocuments, tutorStyle);
        }
        catch (OllamaUnavailableException)
        {
            recap = "AI recap unavailable: could not reach Ollama.";
        }

        session.CompletedAt = DateTime.UtcNow;
        session.AiReviewSummary = recap;
        await context.SaveChangesAsync();

        var graded = answers.Where(a => a.IsCorrect is not null).ToList();
        var totalScore = graded.Sum(a => a.ScoreAwarded);
        var maxScore = (double)graded.Count;

        var sessionDto = await GetSessionDtoAsync(sessionId) ?? throw new NotFoundException("Quiz session not found");
        return new QuizFinishResponseDTO(sessionDto, totalScore, maxScore);
    }

    public async Task<QuizChatResponseDTO> ChatAsync(int sessionId, QuizChatRequestDTO dto)
    {
        var session = await context.QuizSessions
            .AsNoTracking()
            .Include(s => s.Topic)
            .FirstOrDefaultAsync(s => s.Id == sessionId)
            ?? throw new NotFoundException("Quiz session not found");

        var contextDocuments = await topicContextDocumentService.GetAllContextByTopicIdAsync(session.TopicId);

        var answers = await context.UserAnswers
            .AsNoTracking()
            .Include(a => a.Question)
            .Where(a => a.QuizSessionId == sessionId)
            .ToListAsync();
        var topicName = session.Topic?.Name ?? "Unknown";
        var tutorStyle = await GetTutorStyleAsync();
        var results = BuildResults(answers);

        var reply = await ollamaService.ChatAboutQuizAsync(topicName, results, dto.History ?? [], dto.Message, contextDocuments, tutorStyle);
        return new QuizChatResponseDTO(reply);
    }

    public async Task<QuizHintResponseDTO> HintAsync(int sessionId, QuizHintRequestDTO dto)
    {
        var session = await context.QuizSessions
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.Id == sessionId)
            ?? throw new NotFoundException("Quiz session not found");
        var question = await context.Questions
            .AsNoTracking()
            .FirstOrDefaultAsync(q => q.Id == dto.QuestionId && q.TopicId == session.TopicId)
            ?? throw new NotFoundException("Question not found");

        var contextDocuments = await topicContextDocumentService.GetAllContextByTopicIdAsync(session.TopicId);
        var tutorStyle = await GetTutorStyleAsync();
        var hint = await ollamaService.GenerateHintAsync(question.Text, question.CorrectAnswer, contextDocuments, tutorStyle);
        return new QuizHintResponseDTO(hint);
    }

    public async Task<List<QuizSessionResponseDTO>> GetHistoryAsync(int? topicId)
    {
        var query = context.QuizSessions
            .AsNoTracking()
            .Include(s => s.Answers)
            .AsQueryable();

        if (topicId.HasValue) query = query.Where(s => s.TopicId == topicId.Value);
        var sessions = await query.OrderByDescending(s => s.StartedAt).ToListAsync();
        return sessions.Select(MapToDto).ToList();
    }

    public async Task<QuizSessionResponseDTO?> GetByIdAsync(int sessionId)
        => await GetSessionDtoAsync(sessionId);

    private async Task<QuizSessionResponseDTO?> GetSessionDtoAsync(int sessionId)
    {
        var session = await context.QuizSessions
            .Include(s => s.Answers)
            .FirstOrDefaultAsync(s => s.Id == sessionId);
        return session is null ? null : MapToDto(session);
    }

    private static List<Question> GetRandomQuestionsWithMixedDifficulty(List<Question> questions, int count)
    {
        List<Question> selected = new List<Question>();
        while (selected.Count < count)
        {
            for (int d = 1; d <= 5 && selected.Count < count; d++)
            {
                var random = GetRandomQuestionWithFewestAnswers(questions, d);
                if (random != null)
                {
                    questions.Remove(random); // to avoid duplications
                    selected.Add(random);
                }
            }
        }
        return selected;
    }

    // returns a random question with the selected difficulty, null otherwise
    private static Question? GetRandomQuestionWithFewestAnswers(List<Question> questions, int difficulty)
    {
        var questionsBasedDifficulty = questions
            .Where(q => q.Difficulty == difficulty)
            .ToList();

        if (questionsBasedDifficulty.Count == 0)
            return null;

        var answersCount = questionsBasedDifficulty.Min(a => a.Answers.Count);

        return questionsBasedDifficulty
            .Where(q => q.Answers.Count == answersCount)
            .OrderBy(_ => Random.Shared.Next())
            .FirstOrDefault();
    }

    private static QuizSessionResponseDTO MapToDto(QuizSession s) => new(
        s.Id, s.TopicId, s.StartedAt, s.CompletedAt, s.AiReviewSummary, s.IsPractice,
        s.Answers.Select(a => new UserAnswerResponseDTO(
            a.Id, a.QuestionId, a.GivenAnswer, a.IsCorrect, a.ScoreAwarded, a.AiFeedback, a.LanguageFeedback, a.Confidence, a.HintUsed, a.AnsweredAt)).ToList());
}
