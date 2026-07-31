using MediatR;
using Application.Bookings.Common;
using Application.Common.Exceptions;
using Application.Common.Interfaces;
using Application.Common.Security;
using Domain.Booking;
using Microsoft.EntityFrameworkCore;

namespace Application.Bookings.Queries.GetBookingInspections;

public class GetBookingInspectionsQueryHandler
    : IRequestHandler<GetBookingInspectionsQuery, List<TripInspectionDto>>
{
    private readonly IAppDbContext _context;
    private readonly ICurrentUserService _currentUserService;

    public GetBookingInspectionsQueryHandler(
        IAppDbContext context,
        ICurrentUserService currentUserService)
    {
        _context = context;
        _currentUserService = currentUserService;
    }

    public async Task<List<TripInspectionDto>> Handle(
        GetBookingInspectionsQuery request,
        CancellationToken cancellationToken)
    {
        var booking = await _context.Bookings
            .AsNoTracking()
            .FirstOrDefaultAsync(b => b.Id == request.BookingId, cancellationToken);

        if (booking == null)
            throw new NotFoundException(nameof(Booking), request.BookingId);

        // The renter can read an inspection of their own trip; only the owner
        // writes one.
        BookingAccess.EnsureParticipant(booking, _currentUserService);

        return await _context.TripInspections
            .AsNoTracking()
            .Where(i => i.BookingId == booking.Id)
            // Pickup (0) before Return (1) — the order they happened in.
            .OrderBy(i => i.Type)
            .Select(i => new TripInspectionDto(
                i.Id,
                i.BookingId,
                i.Type,
                i.InspectedByUserId,
                i.InspectionDateTime,
                i.FuelLevel,
                i.Cleanliness,
                i.GeneralConditionNotes,
                i.HasDamage,
                i.DamageDescription,
                i.Photos
                    .Select(p => new InspectionPhotoDto(p.Id, p.PhotoUrl, p.Description))
                    .ToList()
            ))
            .ToListAsync(cancellationToken);
    }
}
