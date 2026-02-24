using MediatR;
using Application.Common.Interfaces;
using Application.Common.Models;
using Domain.User;

namespace Application.Auth.Commands.Register
{
    public record RegisterCommand(
        string Email,
        string Password,
        string FirstName,
        string LastName,
        UserRole Role
    ) : IRequest<AuthenticationResult>;

    public class RegisterCommandHandler : IRequestHandler<RegisterCommand, AuthenticationResult>
    {
        private readonly IIdentityService _identityService;

        public RegisterCommandHandler(IIdentityService identityService)
        {
            _identityService = identityService;
        }

        public async Task<AuthenticationResult> Handle(RegisterCommand request, CancellationToken cancellationToken)
        {
            return await _identityService.RegisterAsync(
                request.Email,
                request.Password,
                request.FirstName,
                request.LastName,
                request.Role);
        }
    }
}
