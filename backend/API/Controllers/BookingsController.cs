using API.Requests.Bookings;
using Application.Bookings.Commands.CreateBooking;
using Application.Bookings.Commands.StartTrip;
using Application.Bookings.Commands.EndTrip;
using Application.Bookings.Commands.CancelBooking;
using Application.Bookings.Queries.GetBookings;
using Application.Bookings.Queries.GetBookingById;
using Microsoft.AspNetCore.Mvc;

namespace API.Controllers;

public class BookingsController : BaseApiController
{
    [HttpPost]
    public async Task<IActionResult> CreateBooking([FromBody] CreateBookingRequest request)
    {
        var command = new CreateBookingCommand(
            request.CarId,
            request.StartDate,
            request.EndDate);
            
        var bookingId = await Mediator.Send(command);
        return Ok(bookingId);
    }

    [HttpGet]
    public async Task<IActionResult> GetBookings([FromQuery] SearchBookingsRequest request)
    {
        var query = new GetBookingsQuery(
            request.RenterId,
            request.OwnerId,
            request.Status,
            request.StartDate,
            request.EndDate,
            request.PageNumber,
            request.PageSize);

        return Ok(await Mediator.Send(query));
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetBookingById(Guid id)
    {
        return Ok(await Mediator.Send(new GetBookingByIdQuery(id)));
    }

    [HttpPost("{id:guid}/cancel")]
    public async Task<IActionResult> CancelBooking(Guid id, [FromBody] CancelBookingRequest request)
    {
        var command = new CancelBookingCommand(
            id,
            request.CancellationReason);

        await Mediator.Send(command);
        return NoContent();
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
