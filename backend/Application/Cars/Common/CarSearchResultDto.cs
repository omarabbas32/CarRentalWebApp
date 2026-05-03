using Domain.Car;
using Domain.Booking;

namespace Application.Cars.Common;

public record CarSearchResultDto(
    Guid Id,
    Guid OwnerId,
    string Make,
    string Model,
    int Year,
    string Color,
    string LicensePlate,
    TransmissionType Transmission,
    FuelType FuelType,
    int Seats,
    int Doors,
    CarCategory Category,
    bool HasGPS,
    bool HasBluetooth,
    bool HasUSBCharging,
    bool HasChildSeat,
    bool HasAirConditioning,
    bool HasBackupCamera,
    string LocationAddress,
    string LocationCity,
    string LocationState,
    decimal PricePerDay,
    decimal PricePerWeek,
    decimal PricePerMonth,
    decimal SecurityDeposit,
    int DailyMileageLimit,
    decimal ExtraMileageCharge,
    double AverageRating,
    int TotalReviews,
    int TotalTrips,
    bool IsAvailable,
    DateTime CreatedAt,
    List<string> ImageUrls
);
