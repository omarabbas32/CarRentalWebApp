using Domain.Booking;

namespace Domain.Car
{
    public class CarAvailability
    {
        public Guid Id { get; set; }
        public Guid CarId { get; set; }
        public virtual Car Car { get; set; } = null!;

        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public bool IsAvailable { get; set; }
        public string? Reason { get; set; }
    }
}
