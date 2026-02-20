using Domain.Car;

namespace Domain.Booking
{
    public class Booking
    {
        public Guid Id { get; set; }
        public Guid CarId { get; set; }
        public virtual Domain.Car.Car Car { get; set; } = null!;

        public Guid RenterId { get; set; }
        public virtual Domain.User.User Renter { get; set; } = null!;

        public Guid OwnerId { get; set; }
        public virtual Domain.User.User Owner { get; set; } = null!;

        // Dates
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public DateTime? PickupTime { get; set; }
        public DateTime? ReturnTime { get; set; }
        public DateTime? ActualPickupDateTime { get; set; }
        public DateTime? ActualReturnDateTime { get; set; }

        // Pricing
        public decimal PricePerDay { get; set; }
        public int TotalDays { get; set; }
        public decimal SubTotal { get; set; }
        public decimal ServiceFee { get; set; }
        public decimal TaxAmount { get; set; }
        public decimal SecurityDeposit { get; set; }
        public decimal TotalAmount { get; set; }

        // Mileage
        public int? MileageLimit { get; set; }
        public int? StartMileage { get; set; }
        public int? EndMileage { get; set; }
        public int? TotalMileage { get; set; }
        public decimal? ExtraMileageCharge { get; set; }

        // Status
        public BookingStatus Status { get; set; }

        // Cancellation
        public DateTime? CancelledAt { get; set; }
        public Guid? CancelledByUserId { get; set; }
        public string? CancellationReason { get; set; }
        public decimal? RefundAmount { get; set; }

        public DateTime CreatedAt { get; set; }

        // Relationships
        public virtual ICollection<Payment> Payments { get; set; } = new List<Payment>();
        public virtual ICollection<Message> Messages { get; set; } = new List<Message>();
        public virtual TripInspection? PickupInspection { get; set; }
        public virtual TripInspection? ReturnInspection { get; set; }
        public virtual Review? Review { get; set; }
    }
}
