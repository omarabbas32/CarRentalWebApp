using Domain.Booking;

namespace Domain.Car
{
    public class CarImage
    {
        public Guid Id { get; set; }
        public Guid CarId { get; set; }
        public virtual Car Car { get; set; } = null!;

        public string ImageUrl { get; set; } = string.Empty;
        public int DisplayOrder { get; set; }
        public bool IsPrimary { get; set; }
        public CarImageType ImageType { get; set; }
    }
}
