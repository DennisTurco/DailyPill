namespace DailyPill.Common.Interfaces;

public interface IImportExportService
{
    Task<int> ImportTopicAndQuestionsAsync(Stream file, string filename);
    Task<(string Yaml, string FileName)> ExportTopicAndQuestionsAsync(int topicId);
}
