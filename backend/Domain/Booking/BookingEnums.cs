namespace Domain.Booking
{
    public enum BookingStatus
    {
        Pending,
        Confirmed,
        InProgress,
        Completed,
        Cancelled,
        Disputed
    }

    public enum InspectionType
    {
        Pickup,
        Return
    }

    /// <summary>
    /// Which way round a <see cref="Review"/> points.
    /// </summary>
    /// <remarks>
    /// Only <see cref="RenterToOwner"/> feeds a car's rating — an owner's opinion of a
    /// renter says nothing about the car.
    ///
    /// These values go on the wire as integers. Do not reorder them.
    /// </remarks>
    public enum ReviewType
    {
        RenterToOwner = 0,
        OwnerToRenter = 1
    }
}

