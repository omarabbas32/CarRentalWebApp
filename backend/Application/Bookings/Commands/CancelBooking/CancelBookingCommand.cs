using Application.Common.Security;
using MediatR;

namespace Application.Bookings.Commands.CancelBooking;

[Authorize(Roles = "Renter,Admin,Staff")]
public record CancelBookingCommand(
    Guid BookingId,
    Guid CancelledByUserId,
    string? CancellationReason
) : IRequest<Unit>;
