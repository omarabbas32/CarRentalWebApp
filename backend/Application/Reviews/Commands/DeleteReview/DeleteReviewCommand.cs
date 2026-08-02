using Application.Common.Exceptions;
using Application.Common.Interfaces;
using Application.Common.Security;
using Application.Reviews.Common;
using Domain.Booking;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Reviews.Commands.DeleteReview;

/// <summary>
/// Moderation only.
/// </summary>
/// <remarks>
/// There is deliberately no path for a reviewee to remove a review about themselves, and
/// no path for a reviewer to withdraw one. A rating anyone can delete is not a rating.
/// </remarks>
[Authorize(Roles = "Admin,Staff")]
public record DeleteReviewCommand(Guid Id) : IRequest<Unit>;

public class DeleteReviewCommandHandler : IRequestHandler<DeleteReviewCommand, Unit>
{
    private readonly IAppDbContext _context;

    public DeleteReviewCommandHandler(IAppDbContext context)
    {
        _context = context;
    }

    public async Task<Unit> Handle(
        DeleteReviewCommand request,
        CancellationToken cancellationToken)
    {
        var review = await _context.Reviews
            .Include(r => r.Booking)
            .FirstOrDefaultAsync(r => r.Id == request.Id, cancellationToken);

        if (review is null)
            throw new NotFoundException(nameof(Review), request.Id);

        var carId = review.Booking.CarId;
        var affectsCarRating = review.Type == ReviewType.RenterToOwner;

        _context.Reviews.Remove(review);
        await _context.SaveChangesAsync(cancellationToken);

        if (affectsCarRating)
        {
            await CarRatingRecalculator.RecalculateAsync(_context, carId, cancellationToken);
            await _context.SaveChangesAsync(cancellationToken);
        }

        return Unit.Value;
    }
}
