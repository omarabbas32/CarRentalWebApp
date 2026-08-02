using Domain.User;

namespace Application.Notifications.Common;

/// <summary>
/// A notification as the client sees it.
/// </summary>
/// <remarks>
/// <c>RelatedEntityId</c> is interpreted according to <c>Type</c> — a booking id for the
/// booking and message types, a booking id for a review, null for verification outcomes.
/// The client maps the pair to a route; the server does not know about routes.
/// </remarks>
public record NotificationDto(
    Guid Id,
    NotificationType Type,
    string Title,
    string Body,
    Guid? RelatedEntityId,
    DateTime? ReadAt,
    DateTime CreatedAt);

/// <summary>
/// Shared by the notification and message unread endpoints.
/// </summary>
public record UnreadCountResult(int Count);
