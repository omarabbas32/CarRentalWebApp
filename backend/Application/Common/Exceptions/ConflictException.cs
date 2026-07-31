namespace Application.Common.Exceptions;

/// <summary>
/// The request was understood and the caller was allowed to make it, but the
/// current state of the data will not permit it.
///
/// Use this where a business rule refuses an operation for a reason the caller
/// can act on — deleting a car that still has bookings, say. A plain
/// <see cref="Exception"/> would be logged as an unhandled fault and returned
/// as a generic 500, which tells the user nothing and buries a normal outcome
/// in the error log.
///
/// The message is shown to the caller, so write it for them.
/// </summary>
public class ConflictException : Exception
{
    public ConflictException(string message)
        : base(message)
    {
    }

    public ConflictException(string message, Exception innerException)
        : base(message, innerException)
    {
    }
}
