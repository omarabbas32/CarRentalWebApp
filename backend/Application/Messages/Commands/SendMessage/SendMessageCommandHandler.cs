using Application.Common.Exceptions;
using Application.Common.Interfaces;
using Application.Common.Security;
using Application.Messages.Common;
using Domain.Booking;
using Domain.User;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Messages.Commands.SendMessage;

public class SendMessageCommandHandler : IRequestHandler<SendMessageCommand, MessageDto>
{
    private readonly IAppDbContext _context;
    private readonly ICurrentUserService _currentUserService;
    private readonly INotificationService _notifications;

    public SendMessageCommandHandler(
        IAppDbContext context,
        ICurrentUserService currentUserService,
        INotificationService notifications)
    {
        _context = context;
        _currentUserService = currentUserService;
        _notifications = notifications;
    }

    public async Task<MessageDto> Handle(
        SendMessageCommand request,
        CancellationToken cancellationToken)
    {
        var senderId = _currentUserService.UserId ?? throw new UnauthorizedAccessException();

        var booking = await _context.Bookings
            .FirstOrDefaultAsync(b => b.Id == request.BookingId, cancellationToken);

        if (booking is null)
            throw new NotFoundException(nameof(Booking), request.BookingId);

        // Also derives the recipient — the participant who is not the sender.
        var receiverId = BookingAccess.EnsureThreadParticipant(booking, _currentUserService);

        // No status guard. A thread stays open on a cancelled or completed booking,
        // because those are exactly the conversations that matter most: a damage dispute,
        // a deposit query, a jacket left on the back seat.

        var sender = await _context.Users
            .AsNoTracking()
            .Where(u => u.Id == senderId)
            .Select(u => new { u.FirstName })
            .FirstOrDefaultAsync(cancellationToken);

        if (sender is null)
            throw new NotFoundException(nameof(User), senderId);

        var message = new Message
        {
            Id = Guid.NewGuid(),
            BookingId = booking.Id,
            SenderId = senderId,
            ReceiverId = receiverId,
            Content = request.Content,
            SentAt = DateTime.UtcNow
        };

        _context.Messages.Add(message);
        await _context.SaveChangesAsync(cancellationToken);

        var dto = new MessageDto(
            message.Id,
            message.BookingId,
            message.SenderId,
            sender.FirstName,
            message.ReceiverId,
            message.Content,
            message.SentAt,
            message.ReadAt);

        // Both are best-effort and neither can throw: the message is already saved, and a
        // silent bell is a far better outcome than a lost message.
        await _notifications.PushMessageAsync(receiverId, dto, cancellationToken);
        await _notifications.NotifyAsync(
            receiverId,
            NotificationType.MessageReceived,
            $"Message from {sender.FirstName}",
            Preview(request.Content),
            booking.Id,
            cancellationToken);

        return dto;
    }

    /// <summary>
    /// Notification bodies are a single line in a dropdown, so a long message is trimmed
    /// rather than pushed in full.
    /// </summary>
    private static string Preview(string content)
    {
        const int limit = 120;
        var collapsed = content.Trim();
        return collapsed.Length <= limit
            ? collapsed
            : string.Concat(collapsed.AsSpan(0, limit).TrimEnd(), "…");
    }
}
