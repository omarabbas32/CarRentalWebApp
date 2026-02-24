using MediatR;
using Application.Common.Interfaces;
using Application.Common.Exceptions;
using Domain.Booking;
using Microsoft.EntityFrameworkCore;

namespace Application.Bookings.Commands.EndTrip;

public class EndTripCommandHandler : IRequestHandler<EndTripCommand, Unit>
{
    private readonly IAppDbContext _context;

    public EndTripCommandHandler(IAppDbContext context)
    {
        _context = context;
    }

    public async Task<Unit> Handle(EndTripCommand request, CancellationToken cancellationToken)
    {
        var booking = await _context.Bookings
            .Include(b => b.Car)
            .FirstOrDefaultAsync(b => b.Id == request.BookingId, cancellationToken);

        if (booking == null)
            throw new NotFoundException(nameof(Booking), request.BookingId);

        if (booking.Status != BookingStatus.InProgress)
            throw new Exception("Trip can only be ended for InProgress bookings.");

        var inspection = new TripInspection
        {
            Id = Guid.NewGuid(),
            BookingId = booking.Id,
            Type = InspectionType.Return,
            InspectedByUserId = booking.OwnerId,
            InspectionDateTime = DateTime.UtcNow,
            FuelLevel = request.FuelLevel,
            Cleanliness = request.Cleanliness,
            HasDamage = request.HasDamage,
            DamageDescription = request.DamageDescription
        };

        booking.ActualReturnDateTime = request.ActualReturnDateTime;
        booking.EndMileage = request.EndMileage;
        booking.Status = BookingStatus.Completed;
        booking.ReturnInspection = inspection;

        // Calculate Extra Mileage
        if (booking.StartMileage.HasValue && booking.MileageLimit.HasValue)
        {
            booking.TotalMileage = booking.EndMileage - booking.StartMileage.Value;
            var excess = booking.TotalMileage.Value - (booking.MileageLimit.Value * booking.TotalDays);
            
            if (excess > 0)
            {
                booking.ExtraMileageCharge = excess * booking.Car.ExtraMileageCharge;
                booking.TotalAmount += booking.ExtraMileageCharge.Value;
            }
        }

        await _context.SaveChangesAsync(cancellationToken);

        return Unit.Value;
    }
}
