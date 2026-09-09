namespace DailyPill.Common.DTOs;

public record InfoFactRequestDTO(int TopicId, string Title, string Description, string? Link);

public record InfoFactResponseDTO(
    int Id,
    int TopicId,
    string Title,
    string Description,
    string? Link,
    DateTime CreatedAt,
    DateTime? LastShownAt,
    bool IsDeleted);

public record AIGeneratedInfoFactDTO(string Title, string Description, string? Link);

public record AIGenerateInfoFactsRequestDTO(int TopicId, string Prompt, int Count = 5);

public record AIGenerateInfoFactsResponseDTO(List<AIGeneratedInfoFactDTO> Facts, int Dropped = 0);
