using Domain.Car;
using Domain.Booking;

namespace Application.Cars.Common;

public record CarDto(
    Guid Id,
    Guid OwnerId,
    string Make,
    string Model,
    int Year,
    string Color,
    string LicensePlate,
    string VIN,
    TransmissionType Transmission,
    FuelType FuelType,
    int Seats,
    int Doors,
    int Mileage,
    CarCategory Category,
    bool HasGPS,
    bool HasBluetooth,
    bool HasUSBCharging,
    bool HasChildSeat,
    bool HasAirConditioning,
    bool HasBackupCamera,
    Point Location,
    string LocationAddress,
    string LocationCity,
    string LocationState,
    decimal PricePerDay,
    decimal PricePerWeek,
    decimal PricePerMonth,
    decimal SecurityDeposit,
    int DailyMileageLimit,
    decimal ExtraMileageCharge,
    bool IsAvailable,
    bool IsActive,
    double AverageRating,
    int TotalReviews,
    int TotalTrips,
    DateTime CreatedAt
);
