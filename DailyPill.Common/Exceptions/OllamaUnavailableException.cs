namespace DailyPill.Common.Exceptions;

public class OllamaUnavailableException : Exception
{
    public OllamaUnavailableException() : base() { }

    public OllamaUnavailableException(string message) : base(message) { }

    public OllamaUnavailableException(string? message, Exception? innerException) : base(message, innerException) { }
}
