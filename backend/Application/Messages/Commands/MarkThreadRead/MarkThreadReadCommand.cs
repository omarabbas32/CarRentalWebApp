using Application.Common.Exceptions;
using Application.Common.Interfaces;
using Application.Common.Security;
using Domain.Booking;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Messages.Commands.MarkThreadRead;

/// <summary>
/// Marks every message the caller has received in this thread as read.
/// </summary>
[Authorize]
public record MarkThreadReadCommand(Guid BookingId) : IRequest<Unit>;

public class MarkThreadReadCommandHandler : IRequestHandler<MarkThreadReadCommand, Unit>
{
    private readonly IAppDbContext _context;
    private readonly ICurrentUserService _currentUserService;

    public MarkThreadReadCommandHandler(
        IAppDbContext context,
        ICurrentUserService currentUserService)
    {
        _context = context;
        _currentUserService = currentUserService;
    }

    public async Task<Unit> Handle(
        MarkThreadReadCommand request,
        CancellationToken cancellationToken)
    {
        var userId = _currentUserService.UserId ?? throw new UnauthorizedAccessException();

        var booking = await _context.Bookings
            .AsNoTracking()
            .FirstOrDefaultAsync(b => b.Id == request.BookingId, cancellationToken);

        if (booking is null)
            throw new NotFoundException(nameof(Booking), request.BookingId);

        BookingAccess.EnsureParticipant(booking, _currentUserService);

        var now = DateTime.UtcNow;

        // Only messages addressed to the caller. An admin reading a thread for support
        // matches nothing here and so marks nothing — reading someone else's thread must
        // not clear their unread badge.
        await _context.Messages
            .Where(m => m.BookingId == request.BookingId
                     && m.ReceiverId == userId
                     && m.ReadAt == null)
            .ExecuteUpdateAsync(
                setters => setters.SetProperty(m => m.ReadAt, now),
                cancellationToken);

        return Unit.Value;
    }
}
