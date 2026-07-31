using Domain.Booking;

namespace Application.Bookings.Common;

/// <summary>
/// A hand-over, as recorded.
///
/// <see cref="BookingDto"/> carries the mileage readings and the actual
/// pickup/return times, but nothing else the inspection captured — not the
/// fuel level, not the cleanliness rating, not the damage description, and not
/// the photographs. All of it was written to <c>TripInspections</c> by
/// <c>StartTrip</c> and <c>EndTrip</c> and then had no way out of the database.
/// </summary>
public record TripInspectionDto(
    Guid Id,
    Guid BookingId,
    InspectionType Type,
    Guid InspectedByUserId,
    DateTime InspectionDateTime,
    int FuelLevel,
    int Cleanliness,
    string? GeneralConditionNotes,
    bool HasDamage,
    string? DamageDescription,
    IReadOnlyList<InspectionPhotoDto> Photos
);

public record InspectionPhotoDto(
    Guid Id,
    string PhotoUrl,
    string? Description
);
