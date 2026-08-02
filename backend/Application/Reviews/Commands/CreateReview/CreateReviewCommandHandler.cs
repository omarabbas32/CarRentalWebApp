using Application.Common.Exceptions;
using Application.Common.Interfaces;
using Application.Common.Security;
using Application.Reviews.Common;
using Domain.Booking;
using Domain.User;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Reviews.Commands.CreateReview;

public class CreateReviewCommandHandler : IRequestHandler<CreateReviewCommand, Guid>
{
    private readonly IAppDbContext _context;
    private readonly ICurrentUserService _currentUserService;
    private readonly INotificationService _notifications;

    public CreateReviewCommandHandler(
        IAppDbContext context,
        ICurrentUserService currentUserService,
        INotificationService notifications)
    {
        _context = context;
        _currentUserService = currentUserService;
        _notifications = notifications;
    }

    public async Task<Guid> Handle(
        CreateReviewCommand request,
        CancellationToken cancellationToken)
    {
        var reviewerId = _currentUserService.UserId ?? throw new UnauthorizedAccessException();

        var booking = await _context.Bookings
            .FirstOrDefaultAsync(b => b.Id == request.BookingId, cancellationToken);

        if (booking is null)
            throw new NotFoundException(nameof(Booking), request.BookingId);

        // Reviews are two-sided, so the same rule as messaging applies: Admin and Staff
        // read but do not write. Nobody reviews on someone else's behalf.
        var revieweeId = BookingAccess.EnsureThreadParticipant(booking, _currentUserService);

        // A review is a claim about a trip that happened. Completed is the only status
        // that means one did — it is set by EndTrip, which requires a return inspection.
        if (booking.Status != BookingStatus.Completed)
        {
            throw new ConflictException(
                "You can review this trip once it's finished.");
        }

        var type = booking.RenterId == reviewerId
            ? ReviewType.RenterToOwner
            : ReviewType.OwnerToRenter;

        // Checked here so the user gets a sentence rather than a unique-constraint
        // violation surfacing as a generic 500. The index is still the real guarantee —
        // two submissions racing each other cannot both land.
        var alreadyReviewed = await _context.Reviews
            .AnyAsync(
                r => r.BookingId == booking.Id && r.Type == type,
                cancellationToken);

        if (alreadyReviewed)
            throw new ConflictException("You've already reviewed this trip.");

        var review = new Review
        {
            Id = Guid.NewGuid(),
            BookingId = booking.Id,
            ReviewerId = reviewerId,
            RevieweeId = revieweeId,
            Type = type,
            Rating = request.Rating,
            Comment = string.IsNullOrWhiteSpace(request.Comment) ? null : request.Comment.Trim(),
            CreatedAt = DateTime.UtcNow
        };

        _context.Reviews.Add(review);

        if (type == ReviewType.RenterToOwner)
        {
            // Recalculates over the reviews already in the change tracker as well as the
            // saved ones, so the new rating is included.
            await _context.SaveChangesAsync(cancellationToken);
            await CarRatingRecalculator.RecalculateAsync(_context, booking.CarId, cancellationToken);
        }

        await _context.SaveChangesAsync(cancellationToken);

        await _notifications.NotifyAsync(
            revieweeId,
            NotificationType.ReviewReceived,
            "You have a new review",
            $"Someone rated a trip {request.Rating} out of 5.",
            booking.Id,
            cancellationToken);

        return review.Id;
    }
}
