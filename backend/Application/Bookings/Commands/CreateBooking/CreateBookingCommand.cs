using MediatR;

namespace Application.Bookings.Commands.CreateBooking;

public record CreateBookingCommand(
    Guid CarId,
    Guid RenterId,
    DateTime StartDate,
    DateTime EndDate
) : IRequest<Guid>;
