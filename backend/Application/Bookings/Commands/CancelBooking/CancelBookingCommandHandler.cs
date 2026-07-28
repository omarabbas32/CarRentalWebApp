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

    public CancelBookingCommandHandler(IAppDbContext context, ICurrentUserService currentUserService)
    {
        _context = context;
        _currentUserService = currentUserService;
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

        return Unit.Value;
    }
}
