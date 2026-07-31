using Application.Bookings.Common;
using Application.Common.Security;
using MediatR;

namespace Application.Bookings.Queries.GetBookingInspections;

/// <summary>
/// Both inspections for a booking — pickup and return — with their photos.
///
/// A separate query rather than fields on <see cref="BookingDto"/>: that DTO is
/// returned by the list endpoint a page at a time, and nobody scanning a table
/// of bookings needs every damage description and photo URL for all of them.
///
/// Unlike the existing booking queries, this one is authorized. Inspections
/// carry damage reports and photographs of a specific person's car.
/// </summary>
[Authorize]
public record GetBookingInspectionsQuery(Guid BookingId)
    : IRequest<List<TripInspectionDto>>;
