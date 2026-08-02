using Application.Common.Exceptions;
using Application.Common.Interfaces;
using Application.Common.Security;
using Application.Reviews.Common;
using Domain.Booking;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Reviews.Queries.GetBookingReviews;

/// <summary>
/// Both reviews for one trip, if they exist.
/// </summary>
/// <remarks>
/// This is what tells the booking page whether to offer the review form or show the rating
/// already left. At most two rows come back, one per direction.
/// </remarks>
[Authorize]
public record GetBookingReviewsQuery(Guid BookingId) : IRequest<List<ReviewDto>>;

public class GetBookingReviewsQueryHandler
    : IRequestHandler<GetBookingReviewsQuery, List<ReviewDto>>
{
    private readonly IAppDbContext _context;
    private readonly ICurrentUserService _currentUserService;

    public GetBookingReviewsQueryHandler(
        IAppDbContext context,
        ICurrentUserService currentUserService)
    {
        _context = context;
        _currentUserService = currentUserService;
    }

    public async Task<List<ReviewDto>> Handle(
        GetBookingReviewsQuery request,
        CancellationToken cancellationToken)
    {
        var booking = await _context.Bookings
            .AsNoTracking()
            .FirstOrDefaultAsync(b => b.Id == request.BookingId, cancellationToken);

        if (booking is null)
            throw new NotFoundException(nameof(Booking), request.BookingId);

        BookingAccess.EnsureParticipant(booking, _currentUserService);

        return await _context.Reviews
            .AsNoTracking()
            .Where(r => r.BookingId == request.BookingId)
            .OrderBy(r => r.Type)
            .Select(r => new ReviewDto(
                r.Id,
                r.BookingId,
                r.Booking.CarId,
                r.ReviewerId,
                r.Reviewer.FirstName,
                r.Reviewer.LastName,
                r.RevieweeId,
                r.Type,
                r.Rating,
                r.Comment,
                r.CreatedAt))
            .ToListAsync(cancellationToken);
    }
}
