using Application.Cars.Commands.CreateCar;
using Application.Cars.Commands.DeleteCar;
using Application.Cars.Commands.DeleteCarImage;
using Application.Cars.Commands.SetPrimaryCarImage;
using Application.Cars.Commands.UpdateCar;
using Application.Cars.Queries.GetCarById;
using Application.Cars.Queries.GetCars;
using Application.Cars.Queries.SearchCars;
using Application.Cars.Commands.UploadCarImage;
using Domain.Car;
using API.Requests.Cars;
using Microsoft.AspNetCore.Mvc;

namespace API.Controllers;

public class CarsController : BaseApiController
{
    [HttpPost]
    public async Task<IActionResult> CreateCar([FromBody] CreateCarRequest request)
    {
        var command = new CreateCarCommand(
            request.Make,
            request.Model,
            request.Year,
            request.Color,
            request.LicensePlate,
            request.VIN,
            request.Transmission,
            request.FuelType,
            request.Seats,
            request.Doors,
            request.Mileage,
            request.Category,
            request.HasGPS,
            request.HasBluetooth,
            request.HasUSBCharging,
            request.HasChildSeat,
            request.HasAirConditioning,
            request.HasBackupCamera,
            request.Location,
            request.LocationAddress,
            request.LocationCity,
            request.LocationState,
            request.PricePerDay,
            request.PricePerWeek,
            request.PricePerMonth,
            request.SecurityDeposit,
            request.DailyMileageLimit,
            request.ExtraMileageCharge);
            
        var carId = await Mediator.Send(command);
        return CreatedAtAction(nameof(GetCarById), new { id = carId }, carId);
    }

    [HttpGet("search")]
    public async Task<IActionResult> SearchCars([FromQuery] SearchCarsRequest request)
    {
        var query = new SearchCarsQuery(
            request.City,
            request.State,
            request.StartDate,
            request.EndDate,
            request.MinPrice,
            request.MaxPrice,
            request.Category,
            request.Features,
            request.MinRating,
            request.PageNumber,
            request.PageSize);

        return Ok(await Mediator.Send(query));
    }

    [HttpGet]
    public async Task<IActionResult> GetCars()
    {
        return Ok(await Mediator.Send(new GetCarsQuery()));
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetCarById(Guid id)
    {
        return Ok(await Mediator.Send(new GetCarByIdQuery(id)));
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> UpdateCar(Guid id, [FromBody] UpdateCarRequest request)
    {
        var command = new UpdateCarCommand(
            id,
            request.Make,
            request.Model,
            request.Year,
            request.Color,
            request.LicensePlate,
            request.VIN,
            request.Transmission,
            request.FuelType,
            request.Seats,
            request.Doors,
            request.Mileage,
            request.Category,
            request.HasGPS,
            request.HasBluetooth,
            request.HasUSBCharging,
            request.HasChildSeat,
            request.HasAirConditioning,
            request.HasBackupCamera,
            request.Location,
            request.LocationAddress,
            request.LocationCity,
            request.LocationState,
            request.PricePerDay,
            request.PricePerWeek,
            request.PricePerMonth,
            request.SecurityDeposit,
            request.DailyMileageLimit,
            request.ExtraMileageCharge,
            request.IsAvailable,
            request.IsActive);
            
        await Mediator.Send(command);
        return NoContent();
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> DeleteCar(Guid id)
    {
        await Mediator.Send(new DeleteCarCommand(id));
        return NoContent();
    }

    [HttpPost("{id:guid}/images")]
    public async Task<IActionResult> UploadImage(Guid id, [FromForm] CarImageUploadRequest request)
    {
        var command = new UploadCarImageCommand(id, request.File, request.Type, request.IsPrimary);
        var imageId = await Mediator.Send(command);
        return Ok(imageId);
    }

    [HttpDelete("images/{imageId:guid}")]
    public async Task<IActionResult> DeleteImage(Guid imageId)
    {
        await Mediator.Send(new DeleteCarImageCommand(imageId));
        return NoContent();
    }

    /// <summary>
    /// Promotes an existing photo to the car's cover. Until this existed,
    /// `IsPrimary` could only be set by the upload that created the image.
    /// </summary>
    [HttpPut("images/{imageId:guid}/primary")]
    public async Task<IActionResult> SetPrimaryImage(Guid imageId)
    {
        await Mediator.Send(new SetPrimaryCarImageCommand(imageId));
        return NoContent();
    }
}
