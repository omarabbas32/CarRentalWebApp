using Application.Common.Security;
using MediatR;

namespace Application.Bookings.Commands.CancelBooking;

[Authorize(Roles = "Renter,Admin,Staff")]
public record CancelBookingCommand(
    Guid BookingId,
    string? CancellationReason
) : IRequest<Unit>;
