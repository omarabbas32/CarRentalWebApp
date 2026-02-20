namespace Domain.Booking
{
    public class TripInspection
    {
        public Guid Id { get; set; }
        public Guid BookingId { get; set; }
        public virtual Domain.Booking.Booking Booking { get; set; } = null!;

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
}
