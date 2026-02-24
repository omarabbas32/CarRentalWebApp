using MediatR;
using Domain.Booking;

namespace Application.Bookings.Commands.StartTrip;

public record StartTripCommand(
    Guid BookingId,
    DateTime ActualPickupDateTime,
    int StartMileage,
    int FuelLevel,
    int Cleanliness,
    bool HasDamage,
    string? DamageDescription
) : IRequest<Unit>;
