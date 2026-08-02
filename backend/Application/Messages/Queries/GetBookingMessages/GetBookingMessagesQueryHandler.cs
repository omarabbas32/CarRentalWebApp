using Application.Common.Exceptions;
using Application.Common.Interfaces;
using Application.Common.Security;
using Application.Messages.Common;
using Domain.Booking;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Messages.Queries.GetBookingMessages;

public class GetBookingMessagesQueryHandler
    : IRequestHandler<GetBookingMessagesQuery, GetBookingMessagesResult>
{
    private readonly IAppDbContext _context;
    private readonly ICurrentUserService _currentUserService;

    public GetBookingMessagesQueryHandler(
        IAppDbContext context,
        ICurrentUserService currentUserService)
    {
        _context = context;
        _currentUserService = currentUserService;
    }

    public async Task<GetBookingMessagesResult> Handle(
        GetBookingMessagesQuery request,
        CancellationToken cancellationToken)
    {
        var booking = await _context.Bookings
            .AsNoTracking()
            .FirstOrDefaultAsync(b => b.Id == request.BookingId, cancellationToken);

        if (booking is null)
            throw new NotFoundException(nameof(Booking), request.BookingId);

        BookingAccess.EnsureParticipant(booking, _currentUserService);

        var query = _context.Messages
            .AsNoTracking()
            .Where(m => m.BookingId == request.BookingId);

        var totalCount = await query.CountAsync(cancellationToken);

        var messages = await query
            .OrderByDescending(m => m.SentAt)
            .Skip((request.PageNumber - 1) * request.PageSize)
            .Take(request.PageSize)
            .Select(m => new MessageDto(
                m.Id,
                m.BookingId,
                m.SenderId,
                m.Sender.FirstName,
                m.ReceiverId,
                m.Content,
                m.SentAt,
                m.ReadAt))
            .ToListAsync(cancellationToken);

        var totalPages = (int)Math.Ceiling(totalCount / (double)request.PageSize);

        return new GetBookingMessagesResult(
            messages,
            totalCount,
            request.PageNumber,
            request.PageSize,
            totalPages);
    }
}
