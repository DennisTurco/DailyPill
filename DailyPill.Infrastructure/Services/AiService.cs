using System.Text.Json;
using DailyPill.Common.DTOs;
using DailyPill.Common.Enums;
using DailyPill.Common.Exceptions;
using DailyPill.Common.Interfaces;

namespace DailyPill.Infrastructure.Services;

public class AiService(ITopicService topicService, IOllamaService ollamaService) : IAiService
{
    public AiStatusResponseDTO GetStatus()
    {
        var pullState = ollamaService.GetPullState();
        return new AiStatusResponseDTO(
            ollamaService.IsAvailable(), ollamaService.Model, ollamaService.BaseUrl, ollamaService.GpuEnabled,
            pullState.Pulling, pullState.Status, pullState.Percent);
    }

    public async Task<AIGenerateQuestionsResponseDTO> GenerateQuestionsAsync(AIGenerateQuestionsRequestDTO dto)
    {
        var topic = await topicService.GetByIdAsync(dto.TopicId) ?? throw new NotFoundException("Topic not found");
        var raw = await ollamaService.GenerateQuestionsAsync(topic.Name, dto.Prompt, dto.Count, dto.Difficulty);

        var questions = new List<AIGeneratedQuestionDTO>();
        var dropped = 0;
        foreach (var q in raw)
        {
            try
            {
                var typeStr = q.TryGetProperty("type", out var t) ? t.GetString() : null;
                var text = q.TryGetProperty("text", out var tx) ? tx.GetString() : null;
                if (typeStr is null || string.IsNullOrEmpty(text))
                {
                    dropped++;
                    continue;
                }

                var options = q.TryGetProperty("options", out var opt) && opt.ValueKind == JsonValueKind.Array
                    ? opt.EnumerateArray().Select(o => o.GetString() ?? "").ToList()
                    : null;
                var correctAnswer = q.TryGetProperty("correct_answer", out var ca) && ca.ValueKind == JsonValueKind.String
                    ? ca.GetString()
                    : null;
                var explanation = q.TryGetProperty("explanation", out var ex) && ex.ValueKind == JsonValueKind.String
                    ? ex.GetString()
                    : null;
                if (string.IsNullOrEmpty(correctAnswer))
                {
                    correctAnswer = explanation ?? "";
                }
                if (string.IsNullOrWhiteSpace(correctAnswer))
                {
                    dropped++;
                    continue;
                }

                var difficulty = q.TryGetProperty("difficulty", out var d) && d.ValueKind == JsonValueKind.Number ? d.GetInt32() : 3;
                var type = QuestionTypeStrings.FromWireString(typeStr);

                questions.Add(new AIGeneratedQuestionDTO(type, text, options, correctAnswer, difficulty, explanation));
            }
            catch
            {
                dropped++;
            }
        }

        return new AIGenerateQuestionsResponseDTO(questions, dropped);
    }

    public async Task<AIGenerateInfoFactsResponseDTO> GenerateInfoFactsAsync(AIGenerateInfoFactsRequestDTO dto)
    {
        var topic = await topicService.GetByIdAsync(dto.TopicId) ?? throw new NotFoundException("Topic not found");
        var raw = await ollamaService.GenerateInfoFactsAsync(topic.Name, dto.Prompt, dto.Count);

        var facts = new List<AIGeneratedInfoFactDTO>();
        var dropped = 0;
        foreach (var f in raw)
        {
            try
            {
                var title = f.TryGetProperty("title", out var t) ? t.GetString() : null;
                var description = f.TryGetProperty("description", out var d) ? d.GetString() : null;
                if (string.IsNullOrEmpty(title) || string.IsNullOrEmpty(description))
                {
                    dropped++;
                    continue;
                }
                var link = f.TryGetProperty("link", out var l) && l.ValueKind == JsonValueKind.String ? l.GetString() : null;
                facts.Add(new AIGeneratedInfoFactDTO(title, description, link));
            }
            catch
            {
                dropped++;
            }
        }

        return new AIGenerateInfoFactsResponseDTO(facts, dropped);
    }
}
