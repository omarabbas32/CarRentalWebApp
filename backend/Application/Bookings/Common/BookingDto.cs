using Domain.Booking;

namespace Application.Bookings.Common;

public record BookingDto(
    Guid Id,
    Guid CarId,
    string CarMake,
    string CarModel,
    int CarYear,
    string CarColor,
    string CarLocationCity,
    string CarLocationState,
    Guid RenterId,
    Guid OwnerId,
    DateTime StartDate,
    DateTime EndDate,
    DateTime? ActualPickupDateTime,
    DateTime? ActualReturnDateTime,
    decimal PricePerDay,
    int TotalDays,
    decimal SubTotal,
    decimal ServiceFee,
    decimal TaxAmount,
    decimal SecurityDeposit,
    decimal TotalAmount,
    int? MileageLimit,
    int? StartMileage,
    int? EndMileage,
    int? TotalMileage,
    decimal? ExtraMileageCharge,
    BookingStatus Status,
    DateTime? CancelledAt,
    Guid? CancelledByUserId,
    string? CancellationReason,
    DateTime CreatedAt
);
