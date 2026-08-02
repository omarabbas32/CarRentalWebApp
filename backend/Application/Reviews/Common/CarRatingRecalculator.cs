using Application.Common.Interfaces;
using Domain.Booking;
using Microsoft.EntityFrameworkCore;

namespace Application.Reviews.Common;

/// <summary>
/// Keeps <c>Car.AverageRating</c> and <c>Car.TotalReviews</c> in step with the reviews
/// that actually exist.
/// </summary>
/// <remarks>
/// Recomputes from scratch instead of incrementing. An incremental update is fewer rows
/// read, but it drifts the moment anything happens that it did not anticipate — a review
/// deleted by a moderator, a row fixed by hand, a bug that double-counted once and left
/// the error baked in forever. Recomputing is idempotent and self-healing, and at a few
/// reviews per car the query cost is not worth reasoning about.
///
/// Only <see cref="ReviewType.RenterToOwner"/> counts: what an owner thought of a renter
/// says nothing about the car.
///
/// Mutates the tracked <c>Car</c>; the caller saves.
/// </remarks>
public static class CarRatingRecalculator
{
    public static async Task RecalculateAsync(
        IAppDbContext context,
        Guid carId,
        CancellationToken cancellationToken)
    {
        var car = await context.Cars
            .FirstOrDefaultAsync(c => c.Id == carId, cancellationToken);

        if (car is null) return;

        var ratings = await context.Reviews
            .AsNoTracking()
            .Where(r => r.Type == ReviewType.RenterToOwner && r.Booking.CarId == carId)
            .Select(r => r.Rating)
            .ToListAsync(cancellationToken);

        car.TotalReviews = ratings.Count;
        car.AverageRating = ratings.Count == 0
            ? 0
            : Math.Round(ratings.Average(), 2);
    }
}
