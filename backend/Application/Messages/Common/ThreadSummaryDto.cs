using Domain.Booking;

namespace Application.Messages.Common;

/// <summary>
/// One row in the message inbox: which trip, who you are talking to, and what was said last.
/// </summary>
public record ThreadSummaryDto(
    Guid BookingId,
    Guid CarId,
    string CarMake,
    string CarModel,
    int CarYear,
    BookingStatus BookingStatus,
    Guid CounterpartyId,
    string CounterpartyFirstName,
    string CounterpartyLastName,
    string LastMessagePreview,
    DateTime LastMessageAt,
    int UnreadCount);
