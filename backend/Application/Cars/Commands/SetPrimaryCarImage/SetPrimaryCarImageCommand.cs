using Application.Common.Security;
using MediatR;

namespace Application.Cars.Commands.SetPrimaryCarImage;

/// <summary>
/// Promotes an existing photo to the car's cover.
///
/// Before this, <c>IsPrimary</c> could only be set on the upload that created
/// the image — so changing a cover meant re-uploading the same photograph and
/// leaving the old one behind.
/// </summary>
[Authorize(Roles = "Owner,Admin,Staff")]
public record SetPrimaryCarImageCommand(Guid ImageId) : IRequest<Unit>;
