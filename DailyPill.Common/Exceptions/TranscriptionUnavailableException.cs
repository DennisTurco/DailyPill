namespace DailyPill.Common.Exceptions;

public class TranscriptionUnavailableException : Exception
{
    public TranscriptionUnavailableException() : base() { }

    public TranscriptionUnavailableException(string message) : base(message) { }

    public TranscriptionUnavailableException(string? message, Exception? innerException) : base(message, innerException) { }
}
