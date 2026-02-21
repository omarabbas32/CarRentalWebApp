using MediatR;
using Application.Common.Interfaces;
using Application.Cars.Common;
using Microsoft.EntityFrameworkCore;

namespace Application.Cars.Queries.GetCarById;

public class GetCarByIdQueryHandler : IRequestHandler<GetCarByIdQuery, CarDto>
{
    private readonly IAppDbContext _context;

    public GetCarByIdQueryHandler(IAppDbContext context)
    {
        _context = context;
    }

    public async Task<CarDto> Handle(GetCarByIdQuery request, CancellationToken cancellationToken)
    {
        var car = await _context.Cars
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.Id == request.Id, cancellationToken);

        if (car == null)
        {
            throw new Exception($"Car with ID {request.Id} not found.");
        }

        return new CarDto(
            car.Id,
            car.OwnerId,
            car.Make,
            car.Model,
            car.Year,
            car.Color,
            car.LicensePlate,
            car.VIN,
            car.Transmission,
            car.FuelType,
            car.Seats,
            car.Doors,
            car.Mileage,
            car.Category,
            car.HasGPS,
            car.HasBluetooth,
            car.HasUSBCharging,
            car.HasChildSeat,
            car.HasAirConditioning,
            car.HasBackupCamera,
            car.Location,
            car.LocationAddress,
            car.LocationCity,
            car.LocationState,
            car.PricePerDay,
            car.PricePerWeek,
            car.PricePerMonth,
            car.SecurityDeposit,
            car.DailyMileageLimit,
            car.ExtraMileageCharge,
            car.IsAvailable,
            car.IsActive,
            car.AverageRating,
            car.TotalReviews,
            car.TotalTrips,
            car.CreatedAt
        );
    }
}
