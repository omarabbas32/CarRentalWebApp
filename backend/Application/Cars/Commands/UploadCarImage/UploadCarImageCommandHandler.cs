using MediatR;
using Application.Common.Interfaces;
using Application.Common.Exceptions;
using Domain.Car;
using Microsoft.EntityFrameworkCore;

namespace Application.Cars.Commands.UploadCarImage;

public class UploadCarImageCommandHandler : IRequestHandler<UploadCarImageCommand, Guid>
{
    private readonly IAppDbContext _context;
    private readonly ICloudinaryService _cloudinaryService;

    public UploadCarImageCommandHandler(IAppDbContext context, ICloudinaryService cloudinaryService)
    {
        _context = context;
        _cloudinaryService = cloudinaryService;
    }

    public async Task<Guid> Handle(UploadCarImageCommand request, CancellationToken cancellationToken)
    {
        var car = await _context.Cars
            .Include(c => c.Images)
            .FirstOrDefaultAsync(c => c.Id == request.CarId, cancellationToken);

        if (car == null)
            throw new NotFoundException(nameof(Car), request.CarId);

        // Upload to Cloudinary
        var imageUrl = await _cloudinaryService.UploadImageAsync(request.File, $"cars/{car.Id}");

        if (string.IsNullOrEmpty(imageUrl))
            throw new Exception("Image upload failed.");

        // If this is set as primary, unmark others
        if (request.IsPrimary)
        {
            foreach (var img in car.Images.Where(i => i.IsPrimary))
            {
                img.IsPrimary = false;
            }
        }

        var carImage = new CarImage
        {
            Id = Guid.NewGuid(),
            CarId = car.Id,
            ImageUrl = imageUrl,
            ImageType = request.ImageType,
            IsPrimary = request.IsPrimary,
            DisplayOrder = car.Images.Count + 1
        };

        _context.CarImages.Add(carImage);
        await _context.SaveChangesAsync(cancellationToken);

        return carImage.Id;
    }
}
