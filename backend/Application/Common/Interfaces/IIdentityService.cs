using System.Threading.Tasks;
using Application.Common.Models;
using Domain.User;

namespace Application.Common.Interfaces
{
    public interface IIdentityService
    {
        Task<AuthenticationResult> RegisterAsync(string email, string password, string firstName, string lastName, UserRole role);
        Task<AuthenticationResult> LoginAsync(string email, string password);
        Task<AuthenticationResult> RefreshTokenAsync(string token, string refreshToken, string ipAddress);
        Task<bool> RevokeTokenAsync(string refreshToken, string ipAddress);
    }
}
