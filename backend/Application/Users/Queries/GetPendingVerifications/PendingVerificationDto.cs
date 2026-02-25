using Domain.User;

namespace Application.Users.Queries.GetPendingVerifications;

public class PendingVerificationDto
{
    public Guid UserId { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    
    // Identity Verification
    public string? GovernmentIdImageUrl { get; set; }
    public GovernmentIdType? GovernmentIdType { get; set; }
    public VerificationStatus GovernmentIdStatus { get; set; }
    
    // Driver License Verification
    public string? DriverLicenseFrontImageUrl { get; set; }
    public string? DriverLicenseBackImageUrl { get; set; }
    public VerificationStatus DriverLicenseStatus { get; set; }
    public DateTime? DriverLicenseExpiryDate { get; set; }
}
