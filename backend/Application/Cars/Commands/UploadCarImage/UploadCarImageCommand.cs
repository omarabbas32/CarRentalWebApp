using MediatR;
using Microsoft.AspNetCore.Http;
using Domain.Car;

namespace Application.Cars.Commands.UploadCarImage;

public record UploadCarImageCommand(
    Guid CarId,
    IFormFile File,
    CarImageType ImageType,
    bool IsPrimary = false
) : IRequest<Guid>;
