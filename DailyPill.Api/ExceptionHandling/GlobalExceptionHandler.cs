using DailyPill.Common.Exceptions;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using YamlDotNet.Core;

namespace DailyPill.Api.ExceptionHandling;

public class GlobalExceptionHandler(ILogger<GlobalExceptionHandler> logger) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(HttpContext httpContext, Exception exception, CancellationToken cancellationToken)
    {
        ProblemDetails problemDetails = new ProblemDetails();
        switch (exception)
        {
            case OllamaUnavailableException:
                logger.LogWarning(exception, "Warning occurred: {Message}", exception.Message);
                problemDetails.Status = StatusCodes.Status503ServiceUnavailable;
                problemDetails.Detail = exception.Message;
                problemDetails.Title = "Local AI Service Unavailable";
                break;
            case NotFoundException:
                logger.LogWarning(exception, "Warning occurred: {Message}", exception.Message);
                problemDetails.Status = StatusCodes.Status404NotFound;
                problemDetails.Detail = exception.Message;
                problemDetails.Title = "Not found error";
                break;
            case ArgumentOutOfRangeException or ArgumentException:
                logger.LogWarning(exception, "Warning occurred: {Message}", exception.Message);
                problemDetails.Status = StatusCodes.Status400BadRequest;
                problemDetails.Detail = exception.Message;
                problemDetails.Title = "Bad request error";
                break;
            case YamlException:
                logger.LogWarning(exception, "Warning occurred: {Message}", exception.Message);
                problemDetails.Status = StatusCodes.Status400BadRequest;
                problemDetails.Detail = exception.Message;
                problemDetails.Title = "File error";
                break;
            default:
                logger.LogError(exception, "Exception occurred: {Message}", exception.Message);
                problemDetails.Status = StatusCodes.Status500InternalServerError;
                problemDetails.Title = "Server error";
                break;
        }
        httpContext.Response.StatusCode = problemDetails.Status.Value;

        await httpContext.Response.WriteAsJsonAsync(problemDetails, cancellationToken);

        return true;
    }
}
