using Application.Common.Interfaces;
using Application.Common.Security;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Notifications.Commands.MarkAllNotificationsRead;

[Authorize]
public record MarkAllNotificationsReadCommand : IRequest<Unit>;

public class MarkAllNotificationsReadCommandHandler
    : IRequestHandler<MarkAllNotificationsReadCommand, Unit>
{
    private readonly IAppDbContext _context;
    private readonly ICurrentUserService _currentUserService;

    public MarkAllNotificationsReadCommandHandler(
        IAppDbContext context,
        ICurrentUserService currentUserService)
    {
        _context = context;
        _currentUserService = currentUserService;
    }

    public async Task<Unit> Handle(
        MarkAllNotificationsReadCommand request,
        CancellationToken cancellationToken)
    {
        var userId = _currentUserService.UserId ?? throw new UnauthorizedAccessException();
        var now = DateTime.UtcNow;

        // One UPDATE rather than loading every unread row to stamp it. "Mark all read" is
        // pressed on the largest backlog a user will ever have, which is the worst case to
        // materialise into memory.
        await _context.Notifications
            .Where(n => n.UserId == userId && n.ReadAt == null)
            .ExecuteUpdateAsync(
                setters => setters.SetProperty(n => n.ReadAt, now),
                cancellationToken);

        return Unit.Value;
    }
}
