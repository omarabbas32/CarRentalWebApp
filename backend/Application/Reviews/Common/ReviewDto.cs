using Domain.Booking;

namespace Application.Reviews.Common;

/// <summary>
/// A review as the client sees it.
/// </summary>
/// <remarks>
/// <c>CarId</c> is projected through <c>Booking.CarId</c> rather than stored on the row —
/// see the note on <c>Domain.Booking.Review</c>.
/// </remarks>
public record ReviewDto(
    Guid Id,
    Guid BookingId,
    Guid CarId,
    Guid ReviewerId,
    string ReviewerFirstName,
    string ReviewerLastName,
    Guid RevieweeId,
    ReviewType Type,
    int Rating,
    string? Comment,
    DateTime CreatedAt);
