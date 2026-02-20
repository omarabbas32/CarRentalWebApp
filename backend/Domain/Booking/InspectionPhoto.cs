namespace Domain.Booking
{
    public class InspectionPhoto
    {
        public Guid Id { get; set; }
        public Guid TripInspectionId { get; set; }
        public virtual TripInspection TripInspection { get; set; } = null!;

        public string PhotoUrl { get; set; } = string.Empty;
        public string? Description { get; set; }
    }
}
