using Application.Common.Security;
using Domain.Booking;
using MediatR;
using Microsoft.AspNetCore.Http;

namespace Application.Bookings.Commands.UploadInspectionPhoto;

/// <summary>
/// Attaches a photograph to a booking's pickup or return inspection.
///
/// <c>TripInspection.Photos</c> and the <c>InspectionPhotos</c> table have
/// existed since the schema was written, and nothing has ever written to
/// either: neither <c>StartTripRequest</c> nor <c>EndTripRequest</c> carries a
/// file, and no other command touched the table. An owner documenting damage
/// had nowhere to put the evidence.
///
/// It is a separate call rather than a field on start/end because those two
/// endpoints take JSON, and folding files into them would turn every trip
/// hand-over into a multipart request. The inspection is created by
/// start/end; photos are attached to it afterwards.
/// </summary>
[Authorize(Roles = "Owner,Admin,Staff")]
public record UploadInspectionPhotoCommand(
    Guid BookingId,
    InspectionType Type,
    IFormFile File,
    string? Description = null
) : IRequest<Guid>;
