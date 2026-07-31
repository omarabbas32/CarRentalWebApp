using Application.Common.Security;
using MediatR;
using Domain.User;

namespace Application.Users.Commands.CreateUser;

/// <summary>
/// Provisions an account of any role, including Admin and Staff.
///
/// This was <b>public and unauthenticated</b> — a second, quieter route to the
/// same privilege escalation as self-registration, and a worse one: it also
/// skipped the password policy entirely, so a provisioned Admin could have the
/// password "a". Anyone could `POST /api/users` with `"role": 2`.
///
/// Admin-only now. Self-service sign-up goes through
/// <c>POST /api/auth/register</c>, which is public and restricted to Renter and
/// Owner.
/// </summary>
[Authorize(Roles = "Admin")]
public record CreateUserCommand(
    string Email,
    string Password,
    string PhoneNumber,
    string FirstName,
    string LastName,
    UserRole Role
) : IRequest<Guid>;
