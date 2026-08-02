using Application.Messages.Common;
using Domain.User;

namespace Application.Common.Interfaces;

/// <summary>
/// Telling a user something happened.
/// </summary>
/// <remarks>
/// The port lives here so the Application layer can raise notifications without knowing
/// SignalR exists. The adapter is <c>API.Notifications.SignalRNotificationService</c>.
///
/// <para>
/// <b>Implementations must not throw.</b> A notification is a courtesy; the command that
/// raised it is the actual work. If pushing fails — the hub is down, the user has no open
/// connection, the row will not insert — that must be logged and swallowed, never allowed
/// to turn a successful booking into a 500.
/// </para>
///
/// <para>
/// Callers save their own work <i>first</i> and notify afterwards. That is two
/// transactions on purpose: the failure mode is a lost notification, never a lost booking.
/// Notifying inside the caller's transaction would push a message about a row the client
/// then could not fetch.
/// </para>
/// </remarks>
public interface INotificationService
{
    /// <summary>
    /// Persists a notification and pushes it to the user's live connections, if any.
    /// </summary>
    Task NotifyAsync(
        Guid userId,
        NotificationType type,
        string title,
        string body,
        Guid? relatedEntityId,
        CancellationToken cancellationToken);

    /// <summary>
    /// Pushes a chat message to an open thread. Real-time only — the message is already
    /// persisted as a <c>Message</c> row, so this stores nothing.
    /// </summary>
    Task PushMessageAsync(
        Guid recipientUserId,
        MessageDto message,
        CancellationToken cancellationToken);
}
