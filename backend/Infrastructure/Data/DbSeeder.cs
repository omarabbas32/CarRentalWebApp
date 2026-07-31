using Application.Common.Interfaces;
using Domain.User;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace Infrastructure.Data;

/// <summary>
/// Provisions the first administrator.
///
/// Administrators must never be self-served. <c>POST /api/auth/register</c> is
/// public, so any role it is willing to grant is a role an anonymous caller can
/// take — which is why <see cref="Application.Auth.Commands.Register.RegisterCommand"/>
/// should accept only <see cref="UserRole.Renter"/> and <see cref="UserRole.Owner"/>.
/// This seeder is the supported way to get an Admin account once that door is
/// closed.
///
/// Credentials come from configuration and are never committed:
///
/// <code>
/// "Seed": {
///   "Admin": {
///     "Email": "admin@example.com",
///     "Password": "…",
///     "FirstName": "Site",
///     "LastName": "Admin",
///     "PhoneNumber": "+962790000000"
///   }
/// }
/// </code>
///
/// Put real values in <c>appsettings.Development.json</c> (git-ignored) or, better,
/// in user secrets or environment variables. With no email and password
/// configured the seeder does nothing at all, so it is safe to leave wired up in
/// every environment.
/// </summary>
public static class DbSeeder
{
    public static async Task SeedAdminAsync(
        AppDbContext context,
        IPasswordHasher passwordHasher,
        IConfiguration configuration,
        ILogger logger,
        CancellationToken cancellationToken = default)
    {
        var section = configuration.GetSection("Seed:Admin");
        var email = section["Email"]?.Trim();
        var password = section["Password"];

        if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(password))
        {
            logger.LogInformation(
                "Admin seeding skipped: Seed:Admin:Email and Seed:Admin:Password are not both configured.");
            return;
        }

        // Emails are compared case-insensitively so a differently-cased value in
        // configuration cannot create a second, competing administrator.
        var existing = await context.Users
            .FirstOrDefaultAsync(u => u.Email.ToLower() == email.ToLower(), cancellationToken);

        if (existing is not null)
        {
            if (existing.Role == UserRole.Admin)
            {
                logger.LogInformation("Admin seeding skipped: {Email} is already an administrator.", email);
                return;
            }

            // Promote rather than refuse — the operator asked for this account to
            // be an administrator. The password is deliberately left alone: a
            // seeder that silently reset credentials would undo any rotation.
            var previousRole = existing.Role;
            existing.Role = UserRole.Admin;
            existing.UpdatedAt = DateTime.UtcNow;
            await context.SaveChangesAsync(cancellationToken);

            logger.LogWarning(
                "Promoted existing user {Email} from {PreviousRole} to Admin. Password unchanged.",
                email, previousRole);
            return;
        }

        var admin = new User
        {
            Id = Guid.NewGuid(),
            Email = email,
            PasswordHash = passwordHasher.HashPassword(password),
            FirstName = section["FirstName"]?.Trim() is { Length: > 0 } first ? first : "Site",
            LastName = section["LastName"]?.Trim() is { Length: > 0 } last ? last : "Admin",
            // UpdateUserCommandValidator requires a phone number in E.164, so an
            // account seeded without one cannot edit its own profile later.
            PhoneNumber = section["PhoneNumber"]?.Trim() ?? string.Empty,
            Role = UserRole.Admin,
            Status = UserStatus.Active,
            // Provisioned, not self-registered: there is no address to confirm.
            EmailVerified = true,
            CreatedAt = DateTime.UtcNow,
        };

        context.Users.Add(admin);
        await context.SaveChangesAsync(cancellationToken);

        logger.LogWarning("Seeded administrator {Email} ({Id}).", admin.Email, admin.Id);
    }
}
