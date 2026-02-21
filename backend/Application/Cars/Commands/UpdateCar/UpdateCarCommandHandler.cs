using MediatR;
using Application.Common.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace Application.Cars.Commands.UpdateCar;

public class UpdateCarCommandHandler : IRequestHandler<UpdateCarCommand>
{
    private readonly IAppDbContext _context;

    public UpdateCarCommandHandler(IAppDbContext context)
    {
        _context = context;
    }

    public async Task Handle(UpdateCarCommand request, CancellationToken cancellationToken)
    {
        var car = await _context.Cars
            .FirstOrDefaultAsync(c => c.Id == request.Id, cancellationToken);

        if (car == null)
        {
            throw new Exception($"Car with ID {request.Id} not found.");
        }

        car.Make = request.Make;
        car.Model = request.Model;
        car.Year = request.Year;
        car.Color = request.Color;
        car.LicensePlate = request.LicensePlate;
        car.VIN = request.VIN;
        car.Transmission = request.Transmission;
        car.FuelType = request.FuelType;
        car.Seats = request.Seats;
        car.Doors = request.Doors;
        car.Mileage = request.Mileage;
        car.Category = request.Category;
        car.HasGPS = request.HasGPS;
        car.HasBluetooth = request.HasBluetooth;
        car.HasUSBCharging = request.HasUSBCharging;
        car.HasChildSeat = request.HasChildSeat;
        car.HasAirConditioning = request.HasAirConditioning;
        car.HasBackupCamera = request.HasBackupCamera;
        car.Location = request.Location;
        car.LocationAddress = request.LocationAddress;
        car.LocationCity = request.LocationCity;
        car.LocationState = request.LocationState;
        car.PricePerDay = request.PricePerDay;
        car.PricePerWeek = request.PricePerWeek;
        car.PricePerMonth = request.PricePerMonth;
        car.SecurityDeposit = request.SecurityDeposit;
        car.DailyMileageLimit = request.DailyMileageLimit;
        car.ExtraMileageCharge = request.ExtraMileageCharge;
        car.IsAvailable = request.IsAvailable;
        car.IsActive = request.IsActive;

        await _context.SaveChangesAsync(cancellationToken);
    }
}
