using System.Linq;
using Application.Bookings.Common;
using Application.Common.Interfaces;
using Domain.Booking;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Bookings.Queries.GetBookings;

public class GetBookingsQueryHandler : IRequestHandler<GetBookingsQuery, GetBookingsResult>
{
    private readonly IAppDbContext _context;

    public GetBookingsQueryHandler(IAppDbContext context)
    {
        _context = context;
    }

    public async Task<GetBookingsResult> Handle(GetBookingsQuery request, CancellationToken cancellationToken)
    {
        var query = _context.Bookings
            .AsNoTracking()
            .Include(b => b.Car)
            .Where(b => !request.RenterId.HasValue || b.RenterId == request.RenterId.Value)
            .Where(b => !request.OwnerId.HasValue || b.OwnerId == request.OwnerId.Value)
            .Where(b => !request.Status.HasValue || b.Status == request.Status.Value)
            .Where(b => !request.StartDate.HasValue || b.StartDate >= request.StartDate.Value)
            .Where(b => !request.EndDate.HasValue || b.EndDate <= request.EndDate.Value);

        var totalCount = await query.CountAsync(cancellationToken);

        var bookings = await query
            .OrderByDescending(b => b.CreatedAt)
            .Skip((request.PageNumber - 1) * request.PageSize)
            .Take(request.PageSize)
            .Select(b => new BookingDto(
                b.Id,
                b.CarId,
                b.Car.Make,
                b.Car.Model,
                b.Car.Year,
                b.Car.Color,
                b.Car.LocationCity,
                b.Car.LocationState,
                b.RenterId,
                b.OwnerId,
                b.StartDate,
                b.EndDate,
                b.ActualPickupDateTime,
                b.ActualReturnDateTime,
                b.PricePerDay,
                b.TotalDays,
                b.SubTotal,
                b.ServiceFee,
                b.TaxAmount,
                b.SecurityDeposit,
                b.TotalAmount,
                b.MileageLimit,
                b.StartMileage,
                b.EndMileage,
                b.TotalMileage,
                b.ExtraMileageCharge,
                b.Status,
                b.CancelledAt,
                b.CancelledByUserId,
                b.CancellationReason,
                b.CreatedAt
            ))
            .ToListAsync(cancellationToken);

        var totalPages = (int)Math.Ceiling(totalCount / (double)request.PageSize);

        return new GetBookingsResult(bookings, totalCount, request.PageNumber, request.PageSize, totalPages);
    }
}
