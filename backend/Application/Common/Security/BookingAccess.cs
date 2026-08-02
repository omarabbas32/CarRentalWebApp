using Application.Common.Exceptions;
using Application.Common.Interfaces;
using Domain.User;

namespace Application.Common.Security;

/// <summary>
/// Who may see and act on a booking.
///
/// Every existing booking query — <c>GetBookings</c>, <c>GetBookingById</c> —
/// carries no authorization at all: any caller can read any booking by id, or
/// list someone else's by passing their user id as a filter. That is on the
/// backend fix list and is not addressed here.
///
/// New endpoints do not inherit that. Inspection records carry damage reports
/// and photographs of someone's car, so the ones added for them check.
/// </summary>
public static class BookingAccess
{
    public static void EnsureParticipant(
        Domain.Booking.Booking booking,
        ICurrentUserService currentUser)
    {
        var role = currentUser.Role;
        if (role == UserRole.Admin.ToString() || role == UserRole.Staff.ToString())
        {
            return;
        }

        var userId = currentUser.UserId;
        if (userId is null || (booking.RenterId != userId && booking.OwnerId != userId))
        {
            throw new ForbiddenAccessException();
        }
    }

    /// <summary>
    /// Recording what happened at a hand-over is the owner's job — the renter
    /// can read an inspection but not write one.
    /// </summary>
    public static void EnsureOwner(
        Domain.Booking.Booking booking,
        ICurrentUserService currentUser)
    {
        var role = currentUser.Role;
        if (role == UserRole.Admin.ToString() || role == UserRole.Staff.ToString())
        {
            return;
        }

        if (booking.OwnerId != currentUser.UserId)
        {
            throw new ForbiddenAccessException();
        }
    }

    /// <summary>
    /// The two people in a booking's thread, and only them. Returns the id of whichever
    /// one the caller is not.
    /// </summary>
    /// <remarks>
    /// Unlike <see cref="EnsureParticipant"/>, Admin and Staff do <b>not</b> pass. A
    /// booking-scoped thread has exactly two sides, and a third party has no seat at it —
    /// there would be no counterparty to address a message to. Support can read a thread;
    /// it cannot post into one.
    /// </remarks>
    public static Guid EnsureThreadParticipant(
        Domain.Booking.Booking booking,
        ICurrentUserService currentUser)
    {
        var userId = currentUser.UserId;

        if (userId == booking.RenterId) return booking.OwnerId;
        if (userId == booking.OwnerId) return booking.RenterId;

        throw new ForbiddenAccessException();
    }
}
