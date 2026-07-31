using MediatR;
using Application.Common.Interfaces;
using Application.Cars.Common;
using Microsoft.EntityFrameworkCore;

namespace Application.Cars.Queries.GetCars;

public class GetCarsQueryHandler : IRequestHandler<GetCarsQuery, List<CarDto>>
{
    private readonly IAppDbContext _context;

    public GetCarsQueryHandler(IAppDbContext context)
    {
        _context = context;
    }

    public async Task<List<CarDto>> Handle(GetCarsQuery request, CancellationToken cancellationToken)
    {
        var cars = await _context.Cars
            .AsNoTracking()
            .Select(car => new CarDto(
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
                car.CreatedAt,
                // Same ordering as SearchCarsQueryHandler: primary first, then
                // display order. Projected inside the query, so this stays one
                // round trip rather than one per car.
                car.Images
                    .OrderByDescending(i => i.IsPrimary)
                    .ThenBy(i => i.DisplayOrder)
                    .Select(i => new CarImageDto(i.Id, i.ImageUrl, i.ImageType, i.IsPrimary, i.DisplayOrder))
                    .ToList()
            ))
            .ToListAsync(cancellationToken);

        return cars;
    }
}
