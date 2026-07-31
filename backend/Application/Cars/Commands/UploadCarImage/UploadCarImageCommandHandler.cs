using MediatR;
using Application.Common.Interfaces;
using Application.Common.Exceptions;
using Application.Common.Security;
using Domain.Car;
using Microsoft.EntityFrameworkCore;

namespace Application.Cars.Commands.UploadCarImage;

public class UploadCarImageCommandHandler : IRequestHandler<UploadCarImageCommand, Guid>
{
    private readonly IAppDbContext _context;
    private readonly ICloudinaryService _cloudinaryService;
    private readonly ICurrentUserService _currentUserService;

    public UploadCarImageCommandHandler(
        IAppDbContext context,
        ICloudinaryService cloudinaryService,
        ICurrentUserService currentUserService)
    {
        _context = context;
        _cloudinaryService = cloudinaryService;
        _currentUserService = currentUserService;
    }

    public async Task<Guid> Handle(UploadCarImageCommand request, CancellationToken cancellationToken)
    {
        var car = await _context.Cars
            .Include(c => c.Images)
            .FirstOrDefaultAsync(c => c.Id == request.CarId, cancellationToken);

        if (car == null)
            throw new NotFoundException(nameof(Car), request.CarId);

        CarOwnership.EnsureCanManage(car, _currentUserService);

        // Upload to Cloudinary
        var imageUrl = await _cloudinaryService.UploadImageAsync(request.File, $"cars/{car.Id}");

        if (string.IsNullOrEmpty(imageUrl))
            throw new Exception("Image upload failed.");

        // The first photo on a car is its cover whether or not the caller said
        // so. Without this a listing can end up with photos and no primary,
        // and every consumer orders on `IsPrimary` — so the "cover" would be
        // whichever row happened to sort first.
        var isPrimary = request.IsPrimary || car.Images.Count == 0;

        // If this is set as primary, unmark others
        if (isPrimary)
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
            IsPrimary = isPrimary,
            DisplayOrder = car.Images.Count + 1
        };

        _context.CarImages.Add(carImage);
        await _context.SaveChangesAsync(cancellationToken);

        return carImage.Id;
    }
}
