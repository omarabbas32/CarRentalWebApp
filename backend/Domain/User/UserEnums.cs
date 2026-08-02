namespace Domain.User
{
    public enum UserRole
    {
        Renter,
        Owner,
        Admin,
        Staff
    }

    public enum UserStatus
    {
        Active,
        Inactive,
        Suspended
    }

    public enum VerificationStatus
    {
        Pending,
        Verified,
        Rejected,
        Unverified
    }

    public enum GovernmentIdType
    {
        Passport,
        NationalId,
        DriversLicense
    }

    public enum VerificationDocumentType
    {
        GovernmentId,
        DriverLicenseFront,
        DriverLicenseBack
    }

    /// <summary>
    /// What a <see cref="Notification"/> is about. The client reads this to decide both the
    /// icon and how to interpret <c>RelatedEntityId</c>.
    /// </summary>
    /// <remarks>
    /// These values go on the wire as integers. Do not reorder them. Adding a member here
    /// fails the frontend's exhaustive `notificationHref` check until it is given a route.
    /// </remarks>
    public enum NotificationType
    {
        BookingRequested = 0,
        BookingCancelled = 1,
        TripStarted = 2,
        TripEnded = 3,
        MessageReceived = 4,
        ReviewReceived = 5,
        VerificationApproved = 6,
        VerificationRejected = 7
    }
}
