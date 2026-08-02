using Application.Common.Security;
using MediatR;

namespace Application.Reviews.Commands.CreateReview;

/// <summary>
/// Rate the other party after a finished trip.
/// </summary>
/// <remarks>
/// Takes no reviewee and no direction. Both are derived from which side of the booking
/// the caller is on — a client that named its own reviewee could rate anyone.
/// </remarks>
[Authorize]
public record CreateReviewCommand(Guid BookingId, int Rating, string? Comment)
    : IRequest<Guid>;
