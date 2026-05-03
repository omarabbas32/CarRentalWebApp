using MediatR;
using Application.Bookings.Common;
using Domain.Booking;

namespace Application.Bookings.Queries.GetBookings;

public record GetBookingsQuery(
    Guid? RenterId,
    Guid? OwnerId,
    BookingStatus? Status,
    DateTime? StartDate,
    DateTime? EndDate,
    int PageNumber = 1,
    int PageSize = 20
) : IRequest<GetBookingsResult>;

public record GetBookingsResult(
    List<BookingDto> Bookings,
    int TotalCount,
    int PageNumber,
    int PageSize,
    int TotalPages
);
