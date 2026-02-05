using System;
using System.Collections.Generic;
using CarRental.Core.Enums;
using NetTopologySuite.Geometries;

namespace CarRental.Core.Models
{
    public class Booking
    {
        public Guid Id { get; set; }
        public Guid CarId { get; set; }
        public virtual Car Car { get; set; } = null!;

        public Guid RenterId { get; set; }
        public virtual User Renter { get; set; } = null!;

        public Guid OwnerId { get; set; }
        public virtual User Owner { get; set; } = null!;

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

    public class TripInspection
    {
        public Guid Id { get; set; }
        public Guid BookingId { get; set; }
        public virtual Booking Booking { get; set; } = null!;

        public InspectionType Type { get; set; }
        public Guid InspectedByUserId { get; set; }
        public DateTime InspectionDateTime { get; set; }
        public Point? InspectionLocation { get; set; }

        // Condition
        public int FuelLevel { get; set; } // 0-100
        public int Cleanliness { get; set; } // 1-5
        public string? GeneralConditionNotes { get; set; }

        // Damage
        public bool HasDamage { get; set; }
        public string? DamageDescription { get; set; }

        // Signatures
        public string? RenterSignatureUrl { get; set; }
        public string? OwnerSignatureUrl { get; set; }

        public virtual ICollection<InspectionPhoto> Photos { get; set; } = new List<InspectionPhoto>();
    }

    public class InspectionPhoto
    {
        public Guid Id { get; set; }
        public Guid TripInspectionId { get; set; }
        public virtual TripInspection TripInspection { get; set; } = null!;

        public string PhotoUrl { get; set; } = string.Empty;
        public string? Description { get; set; }
    }
}
