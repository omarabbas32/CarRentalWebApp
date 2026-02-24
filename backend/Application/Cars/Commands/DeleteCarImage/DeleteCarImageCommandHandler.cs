using MediatR;
using Application.Common.Interfaces;
using Application.Common.Exceptions;
using Domain.Car;
using Microsoft.EntityFrameworkCore;

namespace Application.Cars.Commands.DeleteCarImage;

public class DeleteCarImageCommandHandler : IRequestHandler<DeleteCarImageCommand, Unit>
{
    private readonly IAppDbContext _context;
    private readonly ICloudinaryService _cloudinaryService;

    public DeleteCarImageCommandHandler(IAppDbContext context, ICloudinaryService cloudinaryService)
    {
        _context = context;
        _cloudinaryService = cloudinaryService;
    }

    public async Task<Unit> Handle(DeleteCarImageCommand request, CancellationToken cancellationToken)
    {
        var carImage = await _context.CarImages
            .FirstOrDefaultAsync(i => i.Id == request.ImageId, cancellationToken);

        if (carImage == null)
            throw new NotFoundException(nameof(CarImage), request.ImageId);

        // Extract public ID from URL (Cloudinary logic)
        // URL format: https://res.cloudinary.com/cloudname/image/upload/v12345/folder/public_id.jpg
        var publicId = GetPublicIdFromUrl(carImage.ImageUrl);

        if (!string.IsNullOrEmpty(publicId))
        {
            await _cloudinaryService.DeleteImageAsync(publicId);
        }

        _context.CarImages.Remove(carImage);
        await _context.SaveChangesAsync(cancellationToken);

        return Unit.Value;
    }

    private string GetPublicIdFromUrl(string url)
    {
        // Simple logic to extract public id after '/upload/' and version tag
        // Note: This might need to be more robust depending on folder structure
        var parts = url.Split('/');
        var fileName = parts.Last();
        var publicIdWithExt = string.Join("/", parts.SkipWhile(p => p != "upload").Skip(2));
        var publicId = publicIdWithExt.Split('.').First();
        return publicId;
    }
}
