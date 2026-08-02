using API.Hubs;
using Application.Common.Interfaces;
using Application.Messages.Common;
using Application.Notifications.Common;
using Domain.User;
using Microsoft.AspNetCore.SignalR;

namespace API.Notifications;

/// <summary>
/// Persists notifications and pushes them over SignalR.
/// </summary>
/// <remarks>
/// This adapter lives in <c>API</c> rather than <c>Infrastructure</c> because
/// <c>IHubContext&lt;T&gt;</c> comes from the ASP.NET shared framework, and
/// <c>Infrastructure.csproj</c> is a plain class library. Adding a
/// <c>FrameworkReference</c> to it just for this would give the whole data-access project
/// a web dependency. <c>API.Services.CurrentUserService</c> already sets the precedent of
/// an Application port implemented in the API project.
///
/// <para>
/// Every method swallows its own failures. A notification is a courtesy attached to some
/// real piece of work — a booking, a message, a review — and none of that work should fail
/// because the bell did not ring.
/// </para>
/// </remarks>
public class SignalRNotificationService : INotificationService
{
    private readonly IHubContext<NotificationHub> _hub;
    private readonly IAppDbContext _context;
    private readonly ILogger<SignalRNotificationService> _logger;

    public SignalRNotificationService(
        IHubContext<NotificationHub> hub,
        IAppDbContext context,
        ILogger<SignalRNotificationService> logger)
    {
        _hub = hub;
        _context = context;
        _logger = logger;
    }

    public async Task NotifyAsync(
        Guid userId,
        NotificationType type,
        string title,
        string body,
        Guid? relatedEntityId,
        CancellationToken cancellationToken)
    {
        try
        {
            var notification = new Notification
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                Type = type,
                Title = title,
                Body = body,
                RelatedEntityId = relatedEntityId,
                CreatedAt = DateTime.UtcNow
            };

            // Persist before pushing. A user who was offline when this fired still finds it
            // on the bell, and the feature degrades to plain REST if SignalR is unavailable.
            _context.Notifications.Add(notification);
            await _context.SaveChangesAsync(cancellationToken);

            var dto = new NotificationDto(
                notification.Id,
                notification.Type,
                notification.Title,
                notification.Body,
                notification.RelatedEntityId,
                notification.ReadAt,
                notification.CreatedAt);

            await _hub.Clients
                .User(userId.ToString())
                .SendAsync("notification", dto, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(
                ex,
                "Failed to deliver {NotificationType} notification to user {UserId}.",
                type,
                userId);
        }
    }

    public async Task PushMessageAsync(
        Guid recipientUserId,
        MessageDto message,
        CancellationToken cancellationToken)
    {
        try
        {
            // Nothing is stored here — the Message row was written by the command that
            // called this. This is only the nudge that lets an open thread append it
            // without polling.
            await _hub.Clients
                .User(recipientUserId.ToString())
                .SendAsync("message", message, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(
                ex,
                "Failed to push message {MessageId} to user {UserId}.",
                message.Id,
                recipientUserId);
        }
    }
}
