using MediatR;
using Application.Common.Exceptions;
using Application.Common.Interfaces;
using Application.Common.Models;
using Application.Common.Security;
using Domain.Booking;
using Microsoft.EntityFrameworkCore;

namespace Application.Bookings.Commands.DeleteInspectionPhoto;

public class DeleteInspectionPhotoCommandHandler
    : IRequestHandler<DeleteInspectionPhotoCommand, Unit>
{
    private readonly IAppDbContext _context;
    private readonly ICloudinaryService _cloudinaryService;
    private readonly ICurrentUserService _currentUserService;

    public DeleteInspectionPhotoCommandHandler(
        IAppDbContext context,
        ICloudinaryService cloudinaryService,
        ICurrentUserService currentUserService)
    {
        _context = context;
        _cloudinaryService = cloudinaryService;
        _currentUserService = currentUserService;
    }

    public async Task<Unit> Handle(
        DeleteInspectionPhotoCommand request,
        CancellationToken cancellationToken)
    {
        var photo = await _context.InspectionPhotos
            .FirstOrDefaultAsync(p => p.Id == request.PhotoId, cancellationToken);

        if (photo == null)
            throw new NotFoundException(nameof(InspectionPhoto), request.PhotoId);

        var inspection = await _context.TripInspections
            .FirstOrDefaultAsync(i => i.Id == photo.TripInspectionId, cancellationToken);

        if (inspection == null)
            throw new NotFoundException(nameof(TripInspection), photo.TripInspectionId);

        var booking = await _context.Bookings
            .FirstOrDefaultAsync(b => b.Id == inspection.BookingId, cancellationToken);

        if (booking == null)
            throw new NotFoundException(nameof(Booking), inspection.BookingId);

        BookingAccess.EnsureOwner(booking, _currentUserService);

        var publicId = CloudinaryPublicId.FromUrl(photo.PhotoUrl);
        if (!string.IsNullOrEmpty(publicId))
        {
            await _cloudinaryService.DeleteImageAsync(publicId);
        }

        _context.InspectionPhotos.Remove(photo);
        await _context.SaveChangesAsync(cancellationToken);

        return Unit.Value;
    }
}
