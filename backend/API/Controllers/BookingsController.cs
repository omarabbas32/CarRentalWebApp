using API.Requests.Bookings;
using Application.Bookings.Commands.CreateBooking;
using Application.Bookings.Commands.DeleteInspectionPhoto;
using Application.Bookings.Commands.StartTrip;
using Application.Bookings.Commands.EndTrip;
using Application.Bookings.Commands.CancelBooking;
using Application.Bookings.Commands.UploadInspectionPhoto;
using Application.Bookings.Queries.GetBookings;
using Application.Bookings.Queries.GetBookingById;
using Application.Bookings.Queries.GetBookingInspections;
using Domain.Booking;
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

    /// <summary>
    /// Both inspections for a booking, with their photos. Pickup first.
    /// </summary>
    [HttpGet("{id:guid}/inspections")]
    public async Task<IActionResult> GetInspections(Guid id)
    {
        return Ok(await Mediator.Send(new GetBookingInspectionsQuery(id)));
    }

    /// <summary>
    /// Attaches a photo to the pickup or return inspection. The inspection is
    /// created by <c>/start</c> and <c>/end</c>, so the trip has to have
    /// reached that point first.
    /// </summary>
    [HttpPost("{id:guid}/inspections/{type}/photos")]
    public async Task<IActionResult> UploadInspectionPhoto(
        Guid id,
        InspectionType type,
        [FromForm] InspectionPhotoUploadRequest request)
    {
        var command = new UploadInspectionPhotoCommand(id, type, request.File, request.Description);
        var photoId = await Mediator.Send(command);
        return Ok(photoId);
    }

    /// <summary>
    /// Not nested under a booking — a photo id is enough to find its way back.
    /// Mirrors <c>DELETE /api/cars/images/{imageId}</c>.
    /// </summary>
    [HttpDelete("inspections/photos/{photoId:guid}")]
    public async Task<IActionResult> DeleteInspectionPhoto(Guid photoId)
    {
        await Mediator.Send(new DeleteInspectionPhotoCommand(photoId));
        return NoContent();
    }
}
