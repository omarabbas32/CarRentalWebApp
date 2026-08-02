using API.Requests.Messages;
using Application.Messages.Commands.MarkThreadRead;
using Application.Messages.Commands.SendMessage;
using Application.Messages.Queries.GetBookingMessages;
using Application.Messages.Queries.GetThreads;
using Application.Messages.Queries.GetUnreadMessageCount;
using Microsoft.AspNetCore.Mvc;

namespace API.Controllers;

/// <summary>
/// Booking-scoped messaging. A thread belongs to one booking and has two sides — its
/// renter and its owner. There is no way to open a conversation with someone you have no
/// booking with, which is what keeps this free of blocking and spam controls.
/// </summary>
public class MessagesController : BaseApiController
{
    [HttpGet("threads")]
    public async Task<IActionResult> GetThreads([FromQuery] PagedRequest request)
    {
        var query = new GetThreadsQuery(request.PageNumber, request.PageSize);
        return Ok(await Mediator.Send(query));
    }

    [HttpGet("booking/{bookingId:guid}")]
    public async Task<IActionResult> GetBookingMessages(
        Guid bookingId,
        [FromQuery] PagedRequest request)
    {
        var query = new GetBookingMessagesQuery(
            bookingId,
            request.PageNumber,
            request.PageSize);

        return Ok(await Mediator.Send(query));
    }

    [HttpPost]
    public async Task<IActionResult> SendMessage([FromBody] SendMessageRequest request)
    {
        var command = new SendMessageCommand(request.BookingId, request.Content);
        return Ok(await Mediator.Send(command));
    }

    [HttpPost("booking/{bookingId:guid}/read")]
    public async Task<IActionResult> MarkThreadRead(Guid bookingId)
    {
        await Mediator.Send(new MarkThreadReadCommand(bookingId));
        return NoContent();
    }

    [HttpGet("unread-count")]
    public async Task<IActionResult> GetUnreadCount()
    {
        return Ok(await Mediator.Send(new GetUnreadMessageCountQuery()));
    }
}
