using Application.Common.Security;
using MediatR;
using Microsoft.AspNetCore.Http;
using Domain.Car;

namespace Application.Cars.Commands.UploadCarImage;

/// <summary>
/// Was unauthenticated — any caller could attach a photo to any car on the
/// platform. Now matches <c>CreateCar</c> and <c>UpdateCar</c>, with the
/// handler checking ownership on top of the role.
/// </summary>
[Authorize(Roles = "Owner,Admin,Staff")]
public record UploadCarImageCommand(
    Guid CarId,
    IFormFile File,
    CarImageType ImageType,
    bool IsPrimary = false
) : IRequest<Guid>;
