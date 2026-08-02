using MediatR;
using Application.Common.Interfaces;
using Application.Common.Exceptions;
using Domain.Booking;
using Domain.User;
using Microsoft.EntityFrameworkCore;

namespace Application.Bookings.Commands.StartTrip;

public class StartTripCommandHandler : IRequestHandler<StartTripCommand, Unit>
{
    private readonly IAppDbContext _context;
    private readonly INotificationService _notifications;

    public StartTripCommandHandler(IAppDbContext context, INotificationService notifications)
    {
        _context = context;
        _notifications = notifications;
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

        await _notifications.NotifyAsync(
            booking.RenterId,
            NotificationType.TripStarted,
            "Your trip has started",
            "The owner recorded the pickup inspection. Have a good trip.",
            booking.Id,
            cancellationToken);

        return Unit.Value;
    }
}
