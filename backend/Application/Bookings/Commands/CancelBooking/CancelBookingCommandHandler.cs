using MediatR;
using Application.Common.Interfaces;
using Application.Common.Exceptions;
using Domain.Booking;
using Microsoft.EntityFrameworkCore;

namespace Application.Bookings.Commands.CancelBooking;

public class CancelBookingCommandHandler : IRequestHandler<CancelBookingCommand, Unit>
{
    private readonly IAppDbContext _context;

    public CancelBookingCommandHandler(IAppDbContext context)
    {
        _context = context;
    }

    public async Task<Unit> Handle(CancelBookingCommand request, CancellationToken cancellationToken)
    {
        var booking = await _context.Bookings
            .FirstOrDefaultAsync(b => b.Id == request.BookingId, cancellationToken);

        if (booking == null)
            throw new NotFoundException(nameof(Booking), request.BookingId);

        if (booking.Status == BookingStatus.Cancelled)
            throw new Exception("Booking is already cancelled.");

        if (booking.Status == BookingStatus.Completed)
            throw new Exception("Completed bookings cannot be cancelled.");

        booking.Status = BookingStatus.Cancelled;
        booking.CancelledAt = DateTime.UtcNow;
        booking.CancelledByUserId = request.CancelledByUserId;
        booking.CancellationReason = request.CancellationReason;

        await _context.SaveChangesAsync(cancellationToken);

        return Unit.Value;
    }
}
