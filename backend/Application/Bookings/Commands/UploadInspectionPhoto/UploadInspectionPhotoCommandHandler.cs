using MediatR;
using Application.Common.Exceptions;
using Application.Common.Interfaces;
using Application.Common.Security;
using Domain.Booking;
using Microsoft.EntityFrameworkCore;

namespace Application.Bookings.Commands.UploadInspectionPhoto;

public class UploadInspectionPhotoCommandHandler
    : IRequestHandler<UploadInspectionPhotoCommand, Guid>
{
    private readonly IAppDbContext _context;
    private readonly ICloudinaryService _cloudinaryService;
    private readonly ICurrentUserService _currentUserService;

    public UploadInspectionPhotoCommandHandler(
        IAppDbContext context,
        ICloudinaryService cloudinaryService,
        ICurrentUserService currentUserService)
    {
        _context = context;
        _cloudinaryService = cloudinaryService;
        _currentUserService = currentUserService;
    }

    public async Task<Guid> Handle(
        UploadInspectionPhotoCommand request,
        CancellationToken cancellationToken)
    {
        var booking = await _context.Bookings
            .FirstOrDefaultAsync(b => b.Id == request.BookingId, cancellationToken);

        if (booking == null)
            throw new NotFoundException(nameof(Booking), request.BookingId);

        BookingAccess.EnsureOwner(booking, _currentUserService);

        var inspection = await _context.TripInspections
            .FirstOrDefaultAsync(
                i => i.BookingId == booking.Id && i.Type == request.Type,
                cancellationToken);

        // Refused rather than created on the fly. An inspection carries a fuel
        // level, a cleanliness rating and a damage report, all recorded at the
        // hand-over; conjuring an empty one to hang a photo off would invent a
        // record of an event that has not happened.
        if (inspection == null)
        {
            throw new ConflictException(
                request.Type == InspectionType.Pickup
                    ? "Start the trip before adding pick-up photos — the inspection is created when the trip starts."
                    : "End the trip before adding return photos — the inspection is created when the trip ends.");
        }

        var photoUrl = await _cloudinaryService.UploadImageAsync(
            request.File,
            $"inspections/{inspection.Id}");

        // UploadImageAsync returns an empty string rather than throwing when
        // Cloudinary rejects the file — an empty PhotoUrl would be a row
        // pointing at nothing.
        if (string.IsNullOrEmpty(photoUrl))
            throw new Exception("Photo upload failed.");

        var photo = new InspectionPhoto
        {
            Id = Guid.NewGuid(),
            TripInspectionId = inspection.Id,
            PhotoUrl = photoUrl,
            Description = string.IsNullOrWhiteSpace(request.Description)
                ? null
                : request.Description.Trim()
        };

        _context.InspectionPhotos.Add(photo);
        await _context.SaveChangesAsync(cancellationToken);

        return photo.Id;
    }
}
