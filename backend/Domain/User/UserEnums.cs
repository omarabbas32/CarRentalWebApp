namespace Domain.User
{
    public enum UserRole
    {
        Renter,
        Owner,
        Admin
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
}
