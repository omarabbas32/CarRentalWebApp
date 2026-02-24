using API.Requests.Bookings;
using Application.Bookings.Commands.CreateBooking;
using Application.Bookings.Commands.StartTrip;
using Application.Bookings.Commands.EndTrip;
using Microsoft.AspNetCore.Mvc;

namespace API.Controllers;

public class BookingsController : BaseApiController
{
    [HttpPost]
    public async Task<IActionResult> CreateBooking([FromBody] CreateBookingRequest request)
    {
        var command = new CreateBookingCommand(
            request.CarId,
            request.RenterId,
            request.StartDate,
            request.EndDate);
            
        var bookingId = await Mediator.Send(command);
        return Ok(bookingId);
    }

    [HttpPost("{id:guid}/start")]
    public async Task<IActionResult> StartTrip(Guid id, [FromBody] StartTripRequest request)
    {
        var command = new StartTripCommand(
            id,
            request.ActualPickupDateTime,
            request.StartMileage,
            request.FuelLevel,
            request.Cleanliness,
            request.HasDamage,
            request.DamageDescription);
            
        await Mediator.Send(command);
        return NoContent();
    }

    [HttpPost("{id:guid}/end")]
    public async Task<IActionResult> EndTrip(Guid id, [FromBody] EndTripRequest request)
    {
        var command = new EndTripCommand(
            id,
            request.ActualReturnDateTime,
            request.EndMileage,
            request.FuelLevel,
            request.Cleanliness,
            request.HasDamage,
            request.DamageDescription);
            
        await Mediator.Send(command);
        return NoContent();
    }
}
