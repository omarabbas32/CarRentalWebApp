using System;

namespace CarRental.Core.Enums
{
    public enum UserRole
    {
        User,
        Admin,
        SuperAdmin
    }

    public enum UserStatus
    {
        Active,
        Suspended,
        Banned,
        Deleted
    }

    public enum VerificationStatus
    {
        Pending,
        Approved,
        Rejected,
        Expired
    }

    public enum GovernmentIdType
    {
        Passport,
        NationalId,
        StateId
    }

    public enum TransmissionType
    {
        Manual,
        Automatic
    }

    public enum FuelType
    {
        Gasoline,
        Diesel,
        Electric,
        Hybrid
    }

    public enum CarCategory
    {
        Economy,
        Compact,
        MidSize,
        FullSize,
        SUV,
        Luxury,
        Sports,
        Van,
        Truck
    }

    public enum CarImageType
    {
        ExteriorFront,
        ExteriorRear,
        ExteriorSideLeft,
        ExteriorSideRight,
        Interior,
        Dashboard,
        Trunk,
        Other
    }

    public enum BookingStatus
    {
        Pending,
        Approved,
        PaymentPending,
        Confirmed,
        Active,
        Completed,
        Cancelled,
        Rejected,
        Expired
    }

    public enum InspectionType
    {
        Pickup,
        Return
    }

    public enum PaymentType
    {
        BookingPayment,
        SecurityDeposit,
        ExtraMileageCharge,
        DamageFee,
        LateFee,
        Refund
    }

    public enum PaymentMethod
    {
        CreditCard,
        DebitCard,
        PayPal,
        BankTransfer,
        Other
    }

    public enum PaymentStatus
    {
        Pending,
        Processing,
        Completed,
        Failed,
        Cancelled,
        Refunded,
        PartiallyRefunded
    }

    public enum ReviewType
    {
        RenterReviewsCarAndOwner,
        OwnerReviewsRenter
    }

    public enum MessageType
    {
        Text,
        Image,
        Document,
        System
    }

    public enum NotificationType
    {
        BookingRequest,
        BookingApproved,
        BookingRejected,
        BookingCancelled,
        PaymentReceived,
        PaymentFailed,
        TripStarting,
        TripEnding,
        ReviewReceived,
        MessageReceived
    }
}
