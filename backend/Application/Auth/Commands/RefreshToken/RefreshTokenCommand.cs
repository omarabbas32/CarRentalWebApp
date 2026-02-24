using MediatR;
using Application.Common.Interfaces;
using Application.Common.Models;

namespace Application.Auth.Commands.RefreshToken
{
    public record RefreshTokenCommand(
        string Token,
        string RefreshToken,
        string IpAddress
    ) : IRequest<AuthenticationResult>;

    public class RefreshTokenCommandHandler : IRequestHandler<RefreshTokenCommand, AuthenticationResult>
    {
        private readonly IIdentityService _identityService;

        public RefreshTokenCommandHandler(IIdentityService identityService)
        {
            _identityService = identityService;
        }

        public async Task<AuthenticationResult> Handle(RefreshTokenCommand request, CancellationToken cancellationToken)
        {
            return await _identityService.RefreshTokenAsync(
                request.Token,
                request.RefreshToken,
                request.IpAddress);
        }
    }
}
