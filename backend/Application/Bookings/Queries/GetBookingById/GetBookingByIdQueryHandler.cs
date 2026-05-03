using Application.Bookings.Common;
using Application.Common.Interfaces;
using Application.Common.Exceptions;
using Domain.Booking;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Bookings.Queries.GetBookingById;

public class GetBookingByIdQueryHandler : IRequestHandler<GetBookingByIdQuery, BookingDto>
{
    private readonly IAppDbContext _context;

    public GetBookingByIdQueryHandler(IAppDbContext context)
    {
        _context = context;
    }

    public async Task<BookingDto> Handle(GetBookingByIdQuery request, CancellationToken cancellationToken)
    {
        var booking = await _context.Bookings
            .AsNoTracking()
            .Include(b => b.Car)
            .FirstOrDefaultAsync(b => b.Id == request.Id, cancellationToken);

        if (booking == null)
            throw new NotFoundException(nameof(Booking), request.Id);

        return new BookingDto(
            booking.Id,
            booking.CarId,
            booking.Car.Make,
            booking.Car.Model,
            booking.Car.Year,
            booking.Car.Color,
            booking.Car.LocationCity,
            booking.Car.LocationState,
            booking.RenterId,
            booking.OwnerId,
            booking.StartDate,
            booking.EndDate,
            booking.ActualPickupDateTime,
            booking.ActualReturnDateTime,
            booking.PricePerDay,
            booking.TotalDays,
            booking.SubTotal,
            booking.ServiceFee,
            booking.TaxAmount,
            booking.SecurityDeposit,
            booking.TotalAmount,
            booking.MileageLimit,
            booking.StartMileage,
            booking.EndMileage,
            booking.TotalMileage,
            booking.ExtraMileageCharge,
            booking.Status,
            booking.CancelledAt,
            booking.CancelledByUserId,
            booking.CancellationReason,
            booking.CreatedAt
        );
    }
}
