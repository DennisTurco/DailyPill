using DailyPill.Common.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace DailyPill.Api.Controllers;

[ApiController]
[Route("context-document")]
public class TopicContextDocumentController(ITopicContextDocumentService topicContextDocumentService) : ControllerBase
{
    [HttpGet("get-all/{topicId:int}")]
    public async Task<IActionResult> GetAll(int topicId)
        => Ok(await topicContextDocumentService.GetAllContextByTopicIdAsync(topicId));

    [HttpGet("get/{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var document = await topicContextDocumentService.GetByIdAsync(id);
        return document is null ? NotFound(new { detail = "Document not found" }) : Ok(document);
    }

    [HttpPost("upload/{id}")]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> UploadContext(int id, [FromForm] IFormFile file)
    {
        var stream = file.OpenReadStream();
        var filename = file.FileName;
        var contentType = file.ContentType;
        var created = await topicContextDocumentService.UploadAsync(id, stream, filename, contentType);
        return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var deleted = await topicContextDocumentService.DeleteAsync(id);
        return deleted ? NoContent() : NotFound(new { detail = "Document not found" });
    }
}
