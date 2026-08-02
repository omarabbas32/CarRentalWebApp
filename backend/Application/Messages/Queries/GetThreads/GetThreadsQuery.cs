using Application.Common.Interfaces;
using Application.Common.Security;
using Application.Messages.Common;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Messages.Queries.GetThreads;

/// <summary>
/// Every booking the caller has exchanged messages on, most recent first.
/// </summary>
/// <remarks>
/// Threads with no messages do not appear. A booking is not a conversation until somebody
/// says something, and listing every silent booking would bury the real ones.
/// </remarks>
[Authorize]
public record GetThreadsQuery(int PageNumber = 1, int PageSize = 20)
    : IRequest<GetThreadsResult>;

public record GetThreadsResult(
    List<ThreadSummaryDto> Threads,
    int TotalCount,
    int PageNumber,
    int PageSize,
    int TotalPages);

public class GetThreadsQueryHandler : IRequestHandler<GetThreadsQuery, GetThreadsResult>
{
    private readonly IAppDbContext _context;
    private readonly ICurrentUserService _currentUserService;

    public GetThreadsQueryHandler(
        IAppDbContext context,
        ICurrentUserService currentUserService)
    {
        _context = context;
        _currentUserService = currentUserService;
    }

    public async Task<GetThreadsResult> Handle(
        GetThreadsQuery request,
        CancellationToken cancellationToken)
    {
        var userId = _currentUserService.UserId ?? throw new UnauthorizedAccessException();

        // Group the caller's messages by booking. Grouping the messages rather than
        // starting from bookings is what excludes trips nobody has written on.
        var threads = _context.Messages
            .AsNoTracking()
            .Where(m => m.SenderId == userId || m.ReceiverId == userId)
            .GroupBy(m => m.BookingId)
            .Select(g => new
            {
                BookingId = g.Key,
                LastMessageAt = g.Max(m => m.SentAt),
                UnreadCount = g.Count(m => m.ReceiverId == userId && m.ReadAt == null)
            });

        var totalCount = await threads.CountAsync(cancellationToken);

        var page = await threads
            .OrderByDescending(t => t.LastMessageAt)
            .Skip((request.PageNumber - 1) * request.PageSize)
            .Take(request.PageSize)
            .Join(
                _context.Bookings.AsNoTracking(),
                t => t.BookingId,
                b => b.Id,
                (t, b) => new { Thread = t, Booking = b })
            .Select(x => new ThreadSummaryDto(
                x.Booking.Id,
                x.Booking.CarId,
                x.Booking.Car.Make,
                x.Booking.Car.Model,
                x.Booking.Car.Year,
                x.Booking.Status,
                x.Booking.RenterId == userId ? x.Booking.OwnerId : x.Booking.RenterId,
                x.Booking.RenterId == userId
                    ? x.Booking.Owner.FirstName
                    : x.Booking.Renter.FirstName,
                x.Booking.RenterId == userId
                    ? x.Booking.Owner.LastName
                    : x.Booking.Renter.LastName,
                _context.Messages
                    .Where(m => m.BookingId == x.Booking.Id)
                    .OrderByDescending(m => m.SentAt)
                    .Select(m => m.Content)
                    .First(),
                x.Thread.LastMessageAt,
                x.Thread.UnreadCount))
            .ToListAsync(cancellationToken);

        var totalPages = (int)Math.Ceiling(totalCount / (double)request.PageSize);

        return new GetThreadsResult(
            page,
            totalCount,
            request.PageNumber,
            request.PageSize,
            totalPages);
    }
}
