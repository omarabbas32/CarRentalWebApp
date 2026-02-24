using MediatR;

namespace Application.Bookings.Commands.EndTrip;

public record EndTripCommand(
    Guid BookingId,
    DateTime ActualReturnDateTime,
    int EndMileage,
    int FuelLevel,
    int Cleanliness,
    bool HasDamage,
    string? DamageDescription
) : IRequest<Unit>;
