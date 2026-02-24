using Domain.User;

namespace Application.Users.Common;

public record UserDto(
    Guid Id,
    string Email,
    string PhoneNumber,
    string FirstName,
    string LastName,
    UserRole Role,
    UserStatus Status,
    bool IdentityVerified,
    bool DriverLicenseVerified,
    DateTime CreatedAt
);
