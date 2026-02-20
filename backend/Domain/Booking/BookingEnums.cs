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

    public enum TransmissionType
    {
        Manual,
        Automatic,
        SemiAutomatic
    }

    public enum FuelType
    {
        Petrol,
        Diesel,
        Electric,
        Hybrid,
        LPG
    }

    public enum CarCategory
    {
        Economy,
        Compact,
        Intermediate,
        Standard,
        FullSize,
        Luxury,
        Premium,
        SUV,
        Minivan,
        Convertible,
        Pickup
    }

    public enum CarImageType
    {
        Exterior,
        Interior,
        Engine,
        Document
    }
}
