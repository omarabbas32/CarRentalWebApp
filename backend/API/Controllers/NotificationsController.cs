using API.Requests.Notifications;
using Application.Notifications.Commands.MarkAllNotificationsRead;
using Application.Notifications.Commands.MarkNotificationRead;
using Application.Notifications.Queries.GetNotifications;
using Application.Notifications.Queries.GetUnreadNotificationCount;
using Microsoft.AspNetCore.Mvc;

namespace API.Controllers;

/// <summary>
/// The REST half of notifications. The SignalR hub pushes new ones to open connections;
/// these endpoints are how the bell is populated on page load and how the feature keeps
/// working when the socket is down.
///
/// Everything here is scoped to the caller by the handlers — no endpoint takes a user id.
/// </summary>
public class NotificationsController : BaseApiController
{
    [HttpGet]
    public async Task<IActionResult> GetNotifications([FromQuery] GetNotificationsRequest request)
    {
        var query = new GetNotificationsQuery(
            request.UnreadOnly,
            request.PageNumber,
            request.PageSize);

        return Ok(await Mediator.Send(query));
    }

    [HttpGet("unread-count")]
    public async Task<IActionResult> GetUnreadCount()
    {
        return Ok(await Mediator.Send(new GetUnreadNotificationCountQuery()));
    }

    [HttpPost("{id:guid}/read")]
    public async Task<IActionResult> MarkRead(Guid id)
    {
        await Mediator.Send(new MarkNotificationReadCommand(id));
        return NoContent();
    }

    [HttpPost("read-all")]
    public async Task<IActionResult> MarkAllRead()
    {
        await Mediator.Send(new MarkAllNotificationsReadCommand());
        return NoContent();
    }
}
