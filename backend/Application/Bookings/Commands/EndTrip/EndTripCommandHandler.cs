using MediatR;
using Application.Common.Interfaces;
using Application.Common.Exceptions;
using Domain.Booking;
using Domain.User;
using Microsoft.EntityFrameworkCore;

namespace Application.Bookings.Commands.EndTrip;

public class EndTripCommandHandler : IRequestHandler<EndTripCommand, Unit>
{
    private readonly IAppDbContext _context;
    private readonly INotificationService _notifications;

    public EndTripCommandHandler(IAppDbContext context, INotificationService notifications)
    {
        _context = context;
        _notifications = notifications;
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

        // The moment a trip is actually finished, which is what this counter means.
        booking.Car.TotalTrips += 1;

        await _context.SaveChangesAsync(cancellationToken);

        // Ending the trip is also what opens the review window, so this is the renter's
        // cue to leave one.
        await _notifications.NotifyAsync(
            booking.RenterId,
            NotificationType.TripEnded,
            "Trip completed",
            $"Your trip in the {booking.Car.Make} {booking.Car.Model} is finished. You can leave a review.",
            booking.Id,
            cancellationToken);

        return Unit.Value;
    }
}
