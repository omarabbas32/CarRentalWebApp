using MediatR;
using Application.Common.Interfaces;
using Application.Common.Models;

namespace Application.Auth.Commands.Login
{
    public record LoginCommand(
        string Email,
        string Password
    ) : IRequest<AuthenticationResult>;

    public class LoginCommandHandler : IRequestHandler<LoginCommand, AuthenticationResult>
    {
        private readonly IIdentityService _identityService;

        public LoginCommandHandler(IIdentityService identityService)
        {
            _identityService = identityService;
        }

        public async Task<AuthenticationResult> Handle(LoginCommand request, CancellationToken cancellationToken)
        {
            return await _identityService.LoginAsync(
                request.Email,
                request.Password);
        }
    }
}
