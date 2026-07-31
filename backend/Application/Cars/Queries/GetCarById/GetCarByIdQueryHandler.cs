using MediatR;
using Application.Common.Exceptions;
using Application.Common.Interfaces;
using Application.Cars.Common;
using Domain.Car;
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
            // `CarDto` used to carry no images at all, which forced every
            // caller that needed one to pair this query with a search call and
            // match on id — and search only returns cars that are active,
            // available and unbooked, so the workaround failed on exactly the
            // cars an owner most wanted to look at.
            .Include(c => c.Images)
            .FirstOrDefaultAsync(c => c.Id == request.Id, cancellationToken);

        if (car == null)
        {
            // Was a plain Exception, so a missing car came back as a 500 and a
            // detail page could not tell "no such car" from "server broke".
            throw new NotFoundException(nameof(Car), request.Id);
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
            car.CreatedAt,
            car.Images
                .OrderByDescending(i => i.IsPrimary)
                .ThenBy(i => i.DisplayOrder)
                .Select(i => new CarImageDto(i.Id, i.ImageUrl, i.ImageType, i.IsPrimary, i.DisplayOrder))
                .ToList()
        );
    }
}
