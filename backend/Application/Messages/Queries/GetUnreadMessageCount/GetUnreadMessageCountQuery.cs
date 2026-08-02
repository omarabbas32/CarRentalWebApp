using Application.Common.Interfaces;
using Application.Common.Security;
using Application.Notifications.Common;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Messages.Queries.GetUnreadMessageCount;

/// <summary>
/// Unread messages across every thread — the pip on the Messages nav item.
/// </summary>
[Authorize]
public record GetUnreadMessageCountQuery : IRequest<UnreadCountResult>;

public class GetUnreadMessageCountQueryHandler
    : IRequestHandler<GetUnreadMessageCountQuery, UnreadCountResult>
{
    private readonly IAppDbContext _context;
    private readonly ICurrentUserService _currentUserService;

    public GetUnreadMessageCountQueryHandler(
        IAppDbContext context,
        ICurrentUserService currentUserService)
    {
        _context = context;
        _currentUserService = currentUserService;
    }

    public async Task<UnreadCountResult> Handle(
        GetUnreadMessageCountQuery request,
        CancellationToken cancellationToken)
    {
        var userId = _currentUserService.UserId ?? throw new UnauthorizedAccessException();

        var count = await _context.Messages
            .AsNoTracking()
            .CountAsync(
                m => m.ReceiverId == userId && m.ReadAt == null,
                cancellationToken);

        return new UnreadCountResult(count);
    }
}
