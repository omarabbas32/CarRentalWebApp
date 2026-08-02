using Application.Common.Interfaces;
using Application.Notifications.Common;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Notifications.Queries.GetNotifications;

public class GetNotificationsQueryHandler
    : IRequestHandler<GetNotificationsQuery, GetNotificationsResult>
{
    private readonly IAppDbContext _context;
    private readonly ICurrentUserService _currentUserService;

    public GetNotificationsQueryHandler(
        IAppDbContext context,
        ICurrentUserService currentUserService)
    {
        _context = context;
        _currentUserService = currentUserService;
    }

    public async Task<GetNotificationsResult> Handle(
        GetNotificationsQuery request,
        CancellationToken cancellationToken)
    {
        var userId = _currentUserService.UserId ?? throw new UnauthorizedAccessException();

        var query = _context.Notifications
            .AsNoTracking()
            .Where(n => n.UserId == userId);

        if (request.UnreadOnly)
        {
            query = query.Where(n => n.ReadAt == null);
        }

        var totalCount = await query.CountAsync(cancellationToken);

        var notifications = await query
            .OrderByDescending(n => n.CreatedAt)
            .Skip((request.PageNumber - 1) * request.PageSize)
            .Take(request.PageSize)
            .Select(n => new NotificationDto(
                n.Id,
                n.Type,
                n.Title,
                n.Body,
                n.RelatedEntityId,
                n.ReadAt,
                n.CreatedAt))
            .ToListAsync(cancellationToken);

        var totalPages = (int)Math.Ceiling(totalCount / (double)request.PageSize);

        return new GetNotificationsResult(
            notifications,
            totalCount,
            request.PageNumber,
            request.PageSize,
            totalPages);
    }
}
