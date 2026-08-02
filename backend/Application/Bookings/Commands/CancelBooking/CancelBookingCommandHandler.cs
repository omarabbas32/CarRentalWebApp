using MediatR;
using Application.Common.Interfaces;
using Application.Common.Exceptions;
using Domain.Booking;
using Domain.User;
using Microsoft.EntityFrameworkCore;

namespace Application.Bookings.Commands.CancelBooking;

public class CancelBookingCommandHandler : IRequestHandler<CancelBookingCommand, Unit>
{
    private readonly IAppDbContext _context;
    private readonly ICurrentUserService _currentUserService;
    private readonly INotificationService _notifications;

    public CancelBookingCommandHandler(
        IAppDbContext context,
        ICurrentUserService currentUserService,
        INotificationService notifications)
    {
        _context = context;
        _currentUserService = currentUserService;
        _notifications = notifications;
    }

    public async Task<Unit> Handle(CancelBookingCommand request, CancellationToken cancellationToken)
    {
        var cancelledByUserId = _currentUserService.UserId ?? throw new UnauthorizedAccessException();

        var booking = await _context.Bookings
            .FirstOrDefaultAsync(b => b.Id == request.BookingId, cancellationToken);

        if (booking == null)
            throw new NotFoundException(nameof(Booking), request.BookingId);

        var currentUserRole = _currentUserService.Role;

        if (currentUserRole != UserRole.Admin.ToString() && currentUserRole != UserRole.Staff.ToString())
        {
            if (booking.RenterId != cancelledByUserId && booking.OwnerId != cancelledByUserId)
            {
                throw new ForbiddenAccessException();
            }
        }

        if (booking.Status == BookingStatus.Cancelled)
            throw new Exception("Booking is already cancelled.");

        if (booking.Status == BookingStatus.Completed)
            throw new Exception("Completed bookings cannot be cancelled.");

        booking.Status = BookingStatus.Cancelled;
        booking.CancelledAt = DateTime.UtcNow;
        booking.CancelledByUserId = cancelledByUserId;
        booking.CancellationReason = request.CancellationReason;

        await _context.SaveChangesAsync(cancellationToken);

        // Tell whichever party did not do the cancelling. When an admin cancels, both
        // sides are strangers to the action and both are told.
        var recipients = cancelledByUserId == booking.RenterId
            ? new[] { booking.OwnerId }
            : cancelledByUserId == booking.OwnerId
                ? new[] { booking.RenterId }
                : new[] { booking.RenterId, booking.OwnerId };

        foreach (var recipient in recipients)
        {
            await _notifications.NotifyAsync(
                recipient,
                NotificationType.BookingCancelled,
                "Booking cancelled",
                string.IsNullOrWhiteSpace(request.CancellationReason)
                    ? "A booking you were part of has been cancelled."
                    : $"Reason given: {request.CancellationReason}",
                booking.Id,
                cancellationToken);
        }

        return Unit.Value;
    }
}
