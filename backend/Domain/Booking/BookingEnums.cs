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
}

