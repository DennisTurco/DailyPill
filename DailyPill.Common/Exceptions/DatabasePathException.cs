namespace DailyPill.Common.Exceptions;

public class DatabasePathException : Exception
{
    public DatabasePathException() : base() { }
    public DatabasePathException(string message) : base(message) { }
    public DatabasePathException(string? message, Exception? innerException) : base(message, innerException) { }
}
