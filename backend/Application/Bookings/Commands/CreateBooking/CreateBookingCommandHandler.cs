using MediatR;
using Application.Common.Interfaces;
using Application.Common.Exceptions;
using Domain.Booking;
using Domain.Car;
using Microsoft.EntityFrameworkCore;

namespace Application.Bookings.Commands.CreateBooking;

public class CreateBookingCommandHandler : IRequestHandler<CreateBookingCommand, Guid>
{
    private readonly IAppDbContext _context;

    public CreateBookingCommandHandler(IAppDbContext context)
    {
        _context = context;
    }

    public async Task<Guid> Handle(CreateBookingCommand request, CancellationToken cancellationToken)
    {
        var car = await _context.Cars
            .FirstOrDefaultAsync(c => c.Id == request.CarId, cancellationToken);

        if (car == null)
            throw new NotFoundException(nameof(Car), request.CarId);

        // Check availability
        var isBooked = await _context.Bookings
            .AnyAsync(b => b.CarId == request.CarId && 
                         b.Status != BookingStatus.Cancelled &&
                         ((request.StartDate >= b.StartDate && request.StartDate < b.EndDate) ||
                          (request.EndDate > b.StartDate && request.EndDate <= b.EndDate)), 
                      cancellationToken);

        if (isBooked)
            throw new Exception("Car is not available for the selected dates.");

        // Calculate pricing
        var totalDays = (int)(request.EndDate - request.StartDate).TotalDays;
        if (totalDays <= 0) totalDays = 1;

        var subtotal = totalDays * car.PricePerDay;
        var serviceFee = subtotal * 0.10m; // 10% Service Fee
        var taxAmount = subtotal * 0.05m; // 5% Tax
        var totalAmount = subtotal + serviceFee + taxAmount;

        var booking = new Booking
        {
            Id = Guid.NewGuid(),
            CarId = request.CarId,
            RenterId = request.RenterId,
            OwnerId = car.OwnerId,
            StartDate = request.StartDate,
            EndDate = request.EndDate,
            PricePerDay = car.PricePerDay,
            TotalDays = totalDays,
            SubTotal = subtotal,
            ServiceFee = serviceFee,
            TaxAmount = taxAmount,
            SecurityDeposit = car.SecurityDeposit,
            TotalAmount = totalAmount + car.SecurityDeposit, // Total includes deposit
            Status = BookingStatus.Pending,
            CreatedAt = DateTime.UtcNow
        };

        _context.Bookings.Add(booking);
        await _context.SaveChangesAsync(cancellationToken);

        return booking.Id;
    }
}
