namespace Application.Messages.Common;

/// <summary>
/// One message in a booking thread.
/// </summary>
/// <remarks>
/// <c>SenderFirstName</c> is carried so a thread renders without a second round trip.
/// There is no surname: threads have two participants who already know who they are, and
/// a full name is more personal data than the view needs.
/// </remarks>
public record MessageDto(
    Guid Id,
    Guid BookingId,
    Guid SenderId,
    string SenderFirstName,
    Guid ReceiverId,
    string Content,
    DateTime SentAt,
    DateTime? ReadAt);
