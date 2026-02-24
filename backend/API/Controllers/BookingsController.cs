using Application.Bookings.Commands.CreateBooking;
using Microsoft.AspNetCore.Mvc;

namespace API.Controllers;

public class BookingsController : BaseApiController
{
    [HttpPost]
    public async Task<IActionResult> CreateBooking([FromBody] CreateBookingCommand command)
    {
        var bookingId = await Mediator.Send(command);
        return Ok(bookingId);
    }

    [HttpPost("{id:guid}/start")]
    public async Task<IActionResult> StartTrip(Guid id, [FromBody] Application.Bookings.Commands.StartTrip.StartTripCommand command)
    {
        if (id != command.BookingId) return BadRequest("ID mismatch.");
        await Mediator.Send(command);
        return NoContent();
    }

    [HttpPost("{id:guid}/end")]
    public async Task<IActionResult> EndTrip(Guid id, [FromBody] Application.Bookings.Commands.EndTrip.EndTripCommand command)
    {
        if (id != command.BookingId) return BadRequest("ID mismatch.");
        await Mediator.Send(command);
        return NoContent();
    }
}
