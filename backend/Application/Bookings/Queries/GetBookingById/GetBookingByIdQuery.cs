using MediatR;
using Application.Bookings.Common;

namespace Application.Bookings.Queries.GetBookingById;

public record GetBookingByIdQuery(Guid Id) : IRequest<BookingDto>;
