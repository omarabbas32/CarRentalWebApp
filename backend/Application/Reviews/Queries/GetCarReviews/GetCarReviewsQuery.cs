using Application.Common.Interfaces;
using Application.Reviews.Common;
using Domain.Booking;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Reviews.Queries.GetCarReviews;

/// <summary>
/// What renters said about a car, newest first.
/// </summary>
/// <remarks>
/// Public, and deliberately so — it is rendered on the car page, which anyone can see and
/// which search engines should be able to read. That matches <c>GetCarByIdQuery</c>, which
/// also carries no <c>[Authorize]</c>.
///
/// Only <see cref="ReviewType.RenterToOwner"/>: an owner's rating of a renter is not
/// public information about the car.
/// </remarks>
public record GetCarReviewsQuery(Guid CarId, int PageNumber = 1, int PageSize = 20)
    : IRequest<GetCarReviewsResult>;

public record GetCarReviewsResult(
    List<ReviewDto> Reviews,
    int TotalCount,
    int PageNumber,
    int PageSize,
    int TotalPages);

public class GetCarReviewsQueryHandler
    : IRequestHandler<GetCarReviewsQuery, GetCarReviewsResult>
{
    private readonly IAppDbContext _context;

    public GetCarReviewsQueryHandler(IAppDbContext context)
    {
        _context = context;
    }

    public async Task<GetCarReviewsResult> Handle(
        GetCarReviewsQuery request,
        CancellationToken cancellationToken)
    {
        var query = _context.Reviews
            .AsNoTracking()
            .Where(r => r.Type == ReviewType.RenterToOwner
                     && r.Booking.CarId == request.CarId);

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

        return new GetCarReviewsResult(
            reviews,
            totalCount,
            request.PageNumber,
            request.PageSize,
            totalPages);
    }
}
