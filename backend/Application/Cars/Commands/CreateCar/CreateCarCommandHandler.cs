using MediatR;
using Application.Common.Interfaces;
using Domain.Car;

namespace Application.Cars.Commands.CreateCar;

public class CreateCarCommandHandler : IRequestHandler<CreateCarCommand, Guid>
{
    private readonly IAppDbContext _context;

    public CreateCarCommandHandler(IAppDbContext context)
    {
        _context = context;
    }

    public async Task<Guid> Handle(CreateCarCommand request, CancellationToken cancellationToken)
    {
        var car = new Car
        {
            Id = Guid.NewGuid(),
            OwnerId = request.OwnerId,
            Make = request.Make,
            Model = request.Model,
            Year = request.Year,
            Color = request.Color,
            LicensePlate = request.LicensePlate,
            VIN = request.VIN,
            Transmission = request.Transmission,
            FuelType = request.FuelType,
            Seats = request.Seats,
            Doors = request.Doors,
            Mileage = request.Mileage,
            Category = request.Category,
            HasGPS = request.HasGPS,
            HasBluetooth = request.HasBluetooth,
            HasUSBCharging = request.HasUSBCharging,
            HasChildSeat = request.HasChildSeat,
            HasAirConditioning = request.HasAirConditioning,
            HasBackupCamera = request.HasBackupCamera,
            Location = request.Location,
            LocationAddress = request.LocationAddress,
            LocationCity = request.LocationCity,
            LocationState = request.LocationState,
            PricePerDay = request.PricePerDay,
            PricePerWeek = request.PricePerWeek,
            PricePerMonth = request.PricePerMonth,
            SecurityDeposit = request.SecurityDeposit,
            DailyMileageLimit = request.DailyMileageLimit,
            ExtraMileageCharge = request.ExtraMileageCharge,
            IsAvailable = true,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        _context.Cars.Add(car);
        await _context.SaveChangesAsync(cancellationToken);

        return car.Id;
    }
}
