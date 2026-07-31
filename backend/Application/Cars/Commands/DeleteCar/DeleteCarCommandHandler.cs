using MediatR;
using Application.Common.Interfaces;
using Microsoft.EntityFrameworkCore;
using Application.Common.Exceptions;
using Application.Common.Models;
using Domain.Car;
using Domain.User;

namespace Application.Cars.Commands.DeleteCar;

public class DeleteCarCommandHandler : IRequestHandler<DeleteCarCommand>
{
    private readonly IAppDbContext _context;
    private readonly ICurrentUserService _currentUserService;
    private readonly ICloudinaryService _cloudinaryService;

    public DeleteCarCommandHandler(
        IAppDbContext context,
        ICurrentUserService currentUserService,
        ICloudinaryService cloudinaryService)
    {
        _context = context;
        _currentUserService = currentUserService;
        _cloudinaryService = cloudinaryService;
    }

    public async Task Handle(DeleteCarCommand request, CancellationToken cancellationToken)
    {
        var car = await _context.Cars
            .FirstOrDefaultAsync(c => c.Id == request.Id, cancellationToken);

        if (car == null)
        {
            // Was a plain Exception, which the middleware turned into a 500 —
            // so a missing car was indistinguishable from a broken server. The
            // user and booking handlers have always used the typed exception.
            throw new NotFoundException(nameof(Car), request.Id);
        }

        var currentUserRole = _currentUserService.Role;
        var currentUserId = _currentUserService.UserId;

        if (currentUserRole != UserRole.Admin.ToString() && currentUserRole != UserRole.Staff.ToString())
        {
            if (car.OwnerId != currentUserId)
            {
                throw new ForbiddenAccessException();
            }
        }

        // Booking -> Car is mapped OnDelete(DeleteBehavior.Restrict), so a car
        // with any booking against it — completed and cancelled ones included —
        // is rejected by the foreign key inside SaveChangesAsync. That arrives
        // as a DbUpdateException and reaches the caller as a bare 500 with no
        // reason at all.
        //
        // Checking first turns that into a refusal the owner can act on. The
        // reversible alternative is deliberately named: un-listing a car takes
        // it out of search and keeps its history intact.
        var bookingCount = await _context.Bookings
            .CountAsync(b => b.CarId == car.Id, cancellationToken);

        if (bookingCount > 0)
        {
            throw new ConflictException(
                $"This car has {bookingCount} booking{(bookingCount == 1 ? "" : "s")} against it and cannot be deleted. " +
                "Set IsActive to false to take it out of search instead — that keeps its booking history.");
        }

        // Images are not mapped Restrict, but they live in Cloudinary as well as
        // in the database. Removing the rows without them would leave the files
        // orphaned there for good.
        var images = await _context.CarImages
            .Where(i => i.CarId == car.Id)
            .ToListAsync(cancellationToken);

        foreach (var image in images)
        {
            var publicId = CloudinaryPublicId.FromUrl(image.ImageUrl);
            if (!string.IsNullOrEmpty(publicId))
            {
                await _cloudinaryService.DeleteImageAsync(publicId);
            }
        }

        _context.CarImages.RemoveRange(images);
        _context.Cars.Remove(car);
        await _context.SaveChangesAsync(cancellationToken);
    }
}
