using DailyPill.Common.DTOs;

namespace DailyPill.Common.Interfaces;

public interface IAiService
{
    AiStatusResponseDTO GetStatus();
    Task<AIGenerateQuestionsResponseDTO> GenerateQuestionsAsync(AIGenerateQuestionsRequestDTO dto);
    Task<AIGenerateInfoFactsResponseDTO> GenerateInfoFactsAsync(AIGenerateInfoFactsRequestDTO dto);
}
