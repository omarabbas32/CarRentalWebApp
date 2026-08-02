using Application.Common.Interfaces;
using Application.Reviews.Common;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Reviews.Queries.GetUserReviews;

/// <summary>
/// A person's reputation — every review written about them, in both directions.
/// </summary>
/// <remarks>
/// Public. A renter deciding whose car to take and an owner deciding who to hand keys to
/// are the same question from opposite ends, and neither can be answered behind a login.
/// </remarks>
public record GetUserReviewsQuery(Guid UserId, int PageNumber = 1, int PageSize = 20)
    : IRequest<GetUserReviewsResult>;

public record GetUserReviewsResult(
    List<ReviewDto> Reviews,
    int TotalCount,
    int PageNumber,
    int PageSize,
    int TotalPages);

public class GetUserReviewsQueryHandler
    : IRequestHandler<GetUserReviewsQuery, GetUserReviewsResult>
{
    private readonly IAppDbContext _context;

    public GetUserReviewsQueryHandler(IAppDbContext context)
    {
        _context = context;
    }

    public async Task<GetUserReviewsResult> Handle(
        GetUserReviewsQuery request,
        CancellationToken cancellationToken)
    {
        var query = _context.Reviews
            .AsNoTracking()
            .Where(r => r.RevieweeId == request.UserId);

        var totalCount = await query.CountAsync(cancellationToken);

        var reviews = await query
            .OrderByDescending(r => r.CreatedAt)
            .Skip((request.PageNumber - 1) * request.PageSize)
            .Take(request.PageSize)
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

        var totalPages = (int)Math.Ceiling(totalCount / (double)request.PageSize);

        return new GetUserReviewsResult(
            reviews,
            totalCount,
            request.PageNumber,
            request.PageSize,
            totalPages);
    }
}
