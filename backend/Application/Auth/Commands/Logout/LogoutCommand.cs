using MediatR;
using Application.Common.Interfaces;

namespace Application.Auth.Commands.Logout
{
    public record LogoutCommand(
        string RefreshToken,
        string IpAddress
    ) : IRequest<bool>;

    public class LogoutCommandHandler : IRequestHandler<LogoutCommand, bool>
    {
        private readonly IIdentityService _identityService;

        public LogoutCommandHandler(IIdentityService identityService)
        {
            _identityService = identityService;
        }

        public async Task<bool> Handle(LogoutCommand request, CancellationToken cancellationToken)
        {
            return await _identityService.RevokeTokenAsync(
                request.RefreshToken,
                request.IpAddress);
        }
    }
}
