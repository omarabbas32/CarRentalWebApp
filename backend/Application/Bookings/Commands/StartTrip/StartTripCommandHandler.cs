using MediatR;
using Application.Common.Interfaces;
using Application.Common.Exceptions;
using Domain.Booking;
using Microsoft.EntityFrameworkCore;

namespace Application.Bookings.Commands.StartTrip;

public class StartTripCommandHandler : IRequestHandler<StartTripCommand, Unit>
{
    private readonly IAppDbContext _context;

    public StartTripCommandHandler(IAppDbContext context)
    {
        _context = context;
    }

    public async Task<Unit> Handle(StartTripCommand request, CancellationToken cancellationToken)
    {
        var booking = await _context.Bookings
            .FirstOrDefaultAsync(b => b.Id == request.BookingId, cancellationToken);

        if (booking == null)
            throw new NotFoundException(nameof(Booking), request.BookingId);

        if (booking.Status != BookingStatus.Confirmed && booking.Status != BookingStatus.Pending)
            throw new Exception("Trip can only be started for Confirmed or Pending bookings.");

        var inspection = new TripInspection
        {
            Id = Guid.NewGuid(),
            BookingId = booking.Id,
            Type = InspectionType.Pickup,
            InspectedByUserId = booking.OwnerId,
            InspectionDateTime = DateTime.UtcNow,
            FuelLevel = request.FuelLevel,
            Cleanliness = request.Cleanliness,
            HasDamage = request.HasDamage,
            DamageDescription = request.DamageDescription
        };

        booking.ActualPickupDateTime = request.ActualPickupDateTime;
        booking.StartMileage = request.StartMileage;
        booking.Status = BookingStatus.InProgress;
        booking.PickupInspection = inspection;

        await _context.SaveChangesAsync(cancellationToken);

        return Unit.Value;
    }
}
