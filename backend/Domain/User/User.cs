using CarClass = Domain.Car.Car;
using BookingClass = Domain.Booking.Booking;
using Domain.Car;
using Domain.Booking;

namespace Domain.User
{
    public class User
    {
        public Guid Id { get; set; }
        public string Email { get; set; } = string.Empty;
        public string PhoneNumber { get; set; } = string.Empty;
        public UserRole Role { get; set; }
        public UserStatus Status { get; set; }
        
        public bool EmailVerified { get; set; }
        public bool PhoneVerified { get; set; }
        public bool IdentityVerified { get; set; }
        public bool DriverLicenseVerified { get; set; }
        
        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }

        // Relationships
        public virtual UserVerification? Verification { get; set; }
        public virtual ICollection<CarClass> OwnedCars { get; set; } = new List<CarClass>();
        public virtual ICollection<BookingClass> RenterBookings { get; set; } = new List<BookingClass>();
        public virtual ICollection<BookingClass> OwnerBookings { get; set; } = new List<BookingClass>();
        public virtual ICollection<Review> GivenReviews { get; set; } = new List<Review>();
        public virtual ICollection<Review> ReceivedReviews { get; set; } = new List<Review>();
        public virtual ICollection<Message> SentMessages { get; set; } = new List<Message>();
        public virtual ICollection<Message> ReceivedMessages { get; set; } = new List<Message>();
        public virtual ICollection<Payment> Payments { get; set; } = new List<Payment>();
        public virtual ICollection<Notification> Notifications { get; set; } = new List<Notification>();
    }

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
