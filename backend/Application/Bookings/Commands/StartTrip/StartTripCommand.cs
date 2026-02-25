using Application.Common.Security;
using MediatR;
using Domain.Booking;

namespace Application.Bookings.Commands.StartTrip;

[Authorize(Roles = "Owner,Admin,Staff")]
public record StartTripCommand(
    Guid BookingId,
    DateTime ActualPickupDateTime,
    int StartMileage,
    int FuelLevel,
    int Cleanliness,
    bool HasDamage,
    string? DamageDescription
) : IRequest<Unit>;
