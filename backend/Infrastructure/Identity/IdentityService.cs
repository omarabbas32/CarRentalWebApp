using System;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using System.Threading.Tasks;
using Application.Common.Interfaces;
using Application.Common.Models;
using Domain.User;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace Infrastructure.Identity
{
    public class IdentityService : IIdentityService
    {
        private readonly IAppDbContext _context;
        private readonly JwtSettings _jwtSettings;
        private readonly IPasswordHasher _passwordHasher;

        public IdentityService(
            IAppDbContext context,
            IOptions<JwtSettings> jwtSettings,
            IPasswordHasher passwordHasher)
        {
            _context = context;
            _jwtSettings = jwtSettings.Value;
            _passwordHasher = passwordHasher;
        }

        public async Task<AuthenticationResult> RegisterAsync(string email, string password, string firstName, string lastName, UserRole role)
        {
            var existingUser = await _context.Users.AnyAsync(u => u.Email == email);
            if (existingUser)
            {
                throw new Exception("User with this email already exists.");
            }

            var user = new User
            {
                Id = Guid.NewGuid(),
                Email = email,
                FirstName = firstName,
                LastName = lastName,
                PasswordHash = _passwordHasher.HashPassword(password),
                Role = role,
                Status = UserStatus.Active,
                CreatedAt = DateTime.UtcNow
            };

            _context.Users.Add(user);
            await _context.SaveChangesAsync(default);

            return await GenerateAuthenticationResultAsync(user);
        }

        public async Task<AuthenticationResult> LoginAsync(string email, string password)
        {
            var user = await _context.Users
                .Include(u => u.RefreshTokens)
                .SingleOrDefaultAsync(u => u.Email == email);

            if (user == null || !_passwordHasher.VerifyPassword(password, user.PasswordHash))
            {
                throw new Exception("Invalid email or password.");
            }

            return await GenerateAuthenticationResultAsync(user);
        }

        public async Task<AuthenticationResult> RefreshTokenAsync(string token, string refreshToken, string ipAddress)
        {
            var user = await _context.Users
                .Include(u => u.RefreshTokens)
                .SingleOrDefaultAsync(u => u.RefreshTokens.Any(t => t.Token == refreshToken));

            if (user == null) throw new Exception("Invalid token.");

            var refreshTokenEntity = user.RefreshTokens.Single(x => x.Token == refreshToken);

            if (!refreshTokenEntity.IsActive) throw new Exception("Invalid token.");

            // Revoke current refresh token
            var newRefreshToken = GenerateRefreshToken(ipAddress);
            refreshTokenEntity.Revoked = DateTime.UtcNow;
            refreshTokenEntity.RevokedByIp = ipAddress;
            refreshTokenEntity.ReplacedByToken = newRefreshToken.Token;

            user.RefreshTokens.Add(newRefreshToken);
            await _context.SaveChangesAsync(default);

            var jwtToken = GenerateJwtToken(user);

            return new AuthenticationResult
            {
                Token = jwtToken.token,
                RefreshToken = newRefreshToken.Token,
                Expiry = jwtToken.expiry,
                UserId = user.Id,
                Email = user.Email,
                FirstName = user.FirstName,
                LastName = user.LastName,
                Role = user.Role.ToString()
            };
        }

        public async Task<bool> RevokeTokenAsync(string refreshToken, string ipAddress)
        {
            var user = await _context.Users
                .Include(u => u.RefreshTokens)
                .SingleOrDefaultAsync(u => u.RefreshTokens.Any(t => t.Token == refreshToken));

            if (user == null) return false;

            var refreshTokenEntity = user.RefreshTokens.Single(x => x.Token == refreshToken);

            if (!refreshTokenEntity.IsActive) return false;

            refreshTokenEntity.Revoked = DateTime.UtcNow;
            refreshTokenEntity.RevokedByIp = ipAddress;

            await _context.SaveChangesAsync(default);
            return true;
        }

        private async Task<AuthenticationResult> GenerateAuthenticationResultAsync(User user)
        {
            var jwtToken = GenerateJwtToken(user);
            var refreshToken = GenerateRefreshToken(""); // IP address handled in caller or empty for now

            user.RefreshTokens.Add(refreshToken);
            await _context.SaveChangesAsync(default);

            return new AuthenticationResult
            {
                Token = jwtToken.token,
                RefreshToken = refreshToken.Token,
                Expiry = jwtToken.expiry,
                UserId = user.Id,
                Email = user.Email,
                FirstName = user.FirstName,
                LastName = user.LastName,
                Role = user.Role.ToString()
            };
        }

        private (string token, DateTime expiry) GenerateJwtToken(User user)
        {
            var tokenHandler = new JwtSecurityTokenHandler();
            var key = Encoding.ASCII.GetBytes(_jwtSettings.Secret);
            var expiry = DateTime.UtcNow.AddMinutes(_jwtSettings.ExpiryMinutes);

            var tokenDescriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(new[]
                {
                    new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
                    new Claim(ClaimTypes.Email, user.Email),
                    new Claim(ClaimTypes.Role, user.Role.ToString()),
                    new Claim("FirstName", user.FirstName),
                    new Claim("LastName", user.LastName)
                }),
                Expires = expiry,
                SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256Signature),
                Issuer = _jwtSettings.Issuer,
                Audience = _jwtSettings.Audience
            };

            var token = tokenHandler.CreateToken(tokenDescriptor);
            return (tokenHandler.WriteToken(token), expiry);
        }

        private RefreshToken GenerateRefreshToken(string ipAddress)
        {
            using var rng = RandomNumberGenerator.Create();
            var randomBytes = new byte[64];
            rng.GetBytes(randomBytes);

            return new RefreshToken
            {
                Token = Convert.ToBase64String(randomBytes),
                Expires = DateTime.UtcNow.AddDays(_jwtSettings.RefreshTokenExpiryDays),
                Created = DateTime.UtcNow,
                CreatedByIp = ipAddress
            };
        }
    }
}
