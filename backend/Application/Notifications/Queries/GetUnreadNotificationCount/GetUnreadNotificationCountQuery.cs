using Application.Common.Interfaces;
using Application.Common.Security;
using Application.Notifications.Common;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Notifications.Queries.GetUnreadNotificationCount;

/// <summary>
/// The number on the bell. Read on nearly every page, so it is its own endpoint rather
/// than a count derived from fetching the list.
/// </summary>
[Authorize]
public record GetUnreadNotificationCountQuery : IRequest<UnreadCountResult>;

public class GetUnreadNotificationCountQueryHandler
    : IRequestHandler<GetUnreadNotificationCountQuery, UnreadCountResult>
{
    private readonly IAppDbContext _context;
    private readonly ICurrentUserService _currentUserService;

    public GetUnreadNotificationCountQueryHandler(
        IAppDbContext context,
        ICurrentUserService currentUserService)
    {
        _context = context;
        _currentUserService = currentUserService;
    }

    public async Task<UnreadCountResult> Handle(
        GetUnreadNotificationCountQuery request,
        CancellationToken cancellationToken)
    {
        var userId = _currentUserService.UserId ?? throw new UnauthorizedAccessException();

        var count = await _context.Notifications
            .AsNoTracking()
            .CountAsync(n => n.UserId == userId && n.ReadAt == null, cancellationToken);

        return new UnreadCountResult(count);
    }
}
