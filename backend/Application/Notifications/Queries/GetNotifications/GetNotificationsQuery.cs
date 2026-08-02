using Application.Common.Security;
using Application.Notifications.Common;
using MediatR;

namespace Application.Notifications.Queries.GetNotifications;

/// <summary>
/// The caller's own notifications, newest first.
/// </summary>
/// <remarks>
/// There is deliberately no user-id parameter. <c>GET /api/bookings?renterId=</c> takes one
/// and is the reason anyone can read anyone else's bookings; this endpoint reads the id off
/// the token instead, so there is nothing to tamper with.
/// </remarks>
[Authorize]
public record GetNotificationsQuery(
    bool UnreadOnly = false,
    int PageNumber = 1,
    int PageSize = 20) : IRequest<GetNotificationsResult>;

public record GetNotificationsResult(
    List<NotificationDto> Notifications,
    int TotalCount,
    int PageNumber,
    int PageSize,
    int TotalPages);
