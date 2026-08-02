using Application.Common.Security;
using Application.Messages.Common;
using MediatR;

namespace Application.Messages.Commands.SendMessage;

/// <summary>
/// Post into a booking's thread.
/// </summary>
/// <remarks>
/// There is no receiver parameter. The recipient is the other side of the booking, worked
/// out server-side by <c>BookingAccess.EnsureThreadParticipant</c> — a client that could
/// name its own recipient could message strangers.
///
/// Returns the whole <see cref="MessageDto"/> rather than an id: the sender needs the
/// server's <c>SentAt</c> to place the message correctly in the thread, and the id to
/// recognise its own message when the hub echoes it back.
/// </remarks>
[Authorize]
public record SendMessageCommand(Guid BookingId, string Content) : IRequest<MessageDto>;
