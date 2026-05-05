using CarClass = Domain.Car.Car;
using BookingClass = Domain.Booking.Booking;
using Domain.Car;
using Domain.Booking;

namespace Domain.User
{
    public class UserVerification
    {
        public Guid Id { get; set; }
        public Guid UserId { get; set; }
        public virtual User User { get; set; } = null!;

        public string? DriverLicenseNumber { get; set; }
        public string? DriverLicenseState { get; set; }
        public DateTime? DriverLicenseExpiryDate { get; set; }
        public string? DriverLicenseFrontImageUrl { get; set; }
        public string? DriverLicenseBackImageUrl { get; set; }
        public VerificationStatus DriverLicenseStatus { get; set; }

        public string? GovernmentIdNumber { get; set; }
        public GovernmentIdType? GovernmentIdType { get; set; }
        public string? GovernmentIdImageUrl { get; set; }
        public VerificationStatus GovernmentIdStatus { get; set; }
    }
}