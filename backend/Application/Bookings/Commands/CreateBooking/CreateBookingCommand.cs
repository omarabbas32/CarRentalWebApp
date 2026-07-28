using MediatR;
using Application.Common.Security;
using Domain.Booking;

namespace Application.Bookings.Commands.CreateBooking;

[Authorize(Roles = "Renter,Admin,Staff")]
public record CreateBookingCommand(
    Guid CarId,
    DateTime StartDate,
    DateTime EndDate
) : IRequest<Guid>;
