using MediatR;
using Application.Common.Interfaces;
using Application.Common.Exceptions;
using Application.Common.Models;
using Application.Common.Security;
using Domain.Car;
using Microsoft.EntityFrameworkCore;

namespace Application.Cars.Commands.DeleteCarImage;

public class DeleteCarImageCommandHandler : IRequestHandler<DeleteCarImageCommand, Unit>
{
    private readonly IAppDbContext _context;
    private readonly ICloudinaryService _cloudinaryService;
    private readonly ICurrentUserService _currentUserService;

    public DeleteCarImageCommandHandler(
        IAppDbContext context,
        ICloudinaryService cloudinaryService,
        ICurrentUserService currentUserService)
    {
        _context = context;
        _cloudinaryService = cloudinaryService;
        _currentUserService = currentUserService;
    }

    public async Task<Unit> Handle(DeleteCarImageCommand request, CancellationToken cancellationToken)
    {
        var carImage = await _context.CarImages
            .FirstOrDefaultAsync(i => i.Id == request.ImageId, cancellationToken);

        if (carImage == null)
            throw new NotFoundException(nameof(CarImage), request.ImageId);

        var car = await _context.Cars
            .FirstOrDefaultAsync(c => c.Id == carImage.CarId, cancellationToken);

        if (car == null)
            throw new NotFoundException(nameof(Car), carImage.CarId);

        CarOwnership.EnsureCanManage(car, _currentUserService);

        var publicId = CloudinaryPublicId.FromUrl(carImage.ImageUrl);

        if (!string.IsNullOrEmpty(publicId))
        {
            await _cloudinaryService.DeleteImageAsync(publicId);
        }

        var wasPrimary = carImage.IsPrimary;
        _context.CarImages.Remove(carImage);

        // Deleting the cover would otherwise leave the car with none, and
        // SearchCarsQueryHandler orders on IsPrimary — so the gallery's first
        // photo would silently become whichever row happened to sort first.
        if (wasPrimary)
        {
            var replacement = await _context.CarImages
                .Where(i => i.CarId == car.Id && i.Id != carImage.Id)
                .OrderBy(i => i.DisplayOrder)
                .FirstOrDefaultAsync(cancellationToken);

            if (replacement != null)
            {
                replacement.IsPrimary = true;
            }
        }

        await _context.SaveChangesAsync(cancellationToken);

        return Unit.Value;
    }
}
