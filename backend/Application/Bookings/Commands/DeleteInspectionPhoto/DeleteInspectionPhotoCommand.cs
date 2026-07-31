using Application.Common.Security;
using MediatR;

namespace Application.Bookings.Commands.DeleteInspectionPhoto;

/// <summary>
/// Removes a photograph from an inspection, and from Cloudinary with it.
/// </summary>
[Authorize(Roles = "Owner,Admin,Staff")]
public record DeleteInspectionPhotoCommand(Guid PhotoId) : IRequest<Unit>;
