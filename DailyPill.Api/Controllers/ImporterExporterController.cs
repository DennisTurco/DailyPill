using System.Text;
using DailyPill.Common.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace DailyPill.Api.Controllers;

[ApiController]
[Route("export-import")]
public class ImporterExporterController(IImportExportService importExportService) : ControllerBase
{
    [HttpPost("import")]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> ImportTopicAndQuestions([FromForm] IFormFile file)
    {
        var stream = file.OpenReadStream();
        var filename = file.FileName;
        var created = await importExportService.ImportTopicAndQuestionsAsync(stream, filename);
        return CreatedAtAction(nameof(ImportTopicAndQuestions), created);
    }

    [HttpPost("export")]
    public async Task<IActionResult> ExportTopicAndQuestions(int topicId)
    {
        var (yaml, fileName) = await importExportService.ExportTopicAndQuestionsAsync(topicId);
        var safeFileName = string.Join("_", fileName.Split(Path.GetInvalidFileNameChars()));
        return File(Encoding.UTF8.GetBytes(yaml), "application/x-yaml", $"{safeFileName}.yaml");
    }
}
