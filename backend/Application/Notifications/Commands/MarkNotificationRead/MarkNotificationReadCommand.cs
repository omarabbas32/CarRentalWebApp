using Application.Common.Exceptions;
using Application.Common.Interfaces;
using Application.Common.Security;
using Domain.User;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Notifications.Commands.MarkNotificationRead;

[Authorize]
public record MarkNotificationReadCommand(Guid Id) : IRequest<Unit>;

public class MarkNotificationReadCommandHandler
    : IRequestHandler<MarkNotificationReadCommand, Unit>
{
    private readonly IAppDbContext _context;
    private readonly ICurrentUserService _currentUserService;

    public MarkNotificationReadCommandHandler(
        IAppDbContext context,
        ICurrentUserService currentUserService)
    {
        _context = context;
        _currentUserService = currentUserService;
    }

    public async Task<Unit> Handle(
        MarkNotificationReadCommand request,
        CancellationToken cancellationToken)
    {
        var userId = _currentUserService.UserId ?? throw new UnauthorizedAccessException();

        // Scoped to the caller in the lookup itself, so someone else's notification is
        // "not found" rather than "forbidden". A 403 would confirm the row exists, which
        // is a little more than a stranger needs to learn from a guessed id.
        var notification = await _context.Notifications
            .FirstOrDefaultAsync(
                n => n.Id == request.Id && n.UserId == userId,
                cancellationToken);

        if (notification is null)
            throw new NotFoundException(nameof(Notification), request.Id);

        // Idempotent: re-marking keeps the first timestamp. Two tabs both marking the same
        // row read is normal, not a conflict.
        if (notification.ReadAt is null)
        {
            notification.ReadAt = DateTime.UtcNow;
            await _context.SaveChangesAsync(cancellationToken);
        }

        return Unit.Value;
    }
}
