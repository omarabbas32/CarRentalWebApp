using System;
using CarRental.Core.Enums;

namespace CarRental.Core.Models
{
    public class Payment
    {
        public Guid Id { get; set; }
        public Guid BookingId { get; set; }
        public virtual Booking Booking { get; set; } = null!;

        public Guid PayerId { get; set; }
        public virtual User Payer { get; set; } = null!;

        public Guid PayeeId { get; set; }
        public virtual User Payee { get; set; } = null!;

        public decimal Amount { get; set; }
        public decimal PlatformFee { get; set; }
        public decimal PayeeAmount { get; set; }

        public PaymentType Type { get; set; }
        public PaymentMethod Method { get; set; }
        public PaymentStatus Status { get; set; }

        // Stripe fields
        public string? StripePaymentIntentId { get; set; }
        public string? StripeChargeId { get; set; }
        public string? StripeTransferId { get; set; }

        // Refund info
        public bool IsRefunded { get; set; }
        public decimal? RefundAmount { get; set; }
        public DateTime? RefundedAt { get; set; }
        public string? RefundReason { get; set; }

        // Payout info
        public bool IsPaidOut { get; set; }
        public DateTime? PaidOutAt { get; set; }

        public DateTime CreatedAt { get; set; }
    }

    public class Review
    {
        public Guid Id { get; set; }
        public Guid BookingId { get; set; }
        public virtual Booking Booking { get; set; } = null!;

        public Guid ReviewerId { get; set; }
        public virtual User Reviewer { get; set; } = null!;

        public Guid RevieweeId { get; set; }
        public virtual User Reviewee { get; set; } = null!;

        public ReviewType Type { get; set; }

        // Ratings (1-5)
        public int OverallRating { get; set; }
        public int? CarConditionRating { get; set; }
        public int? CommunicationRating { get; set; }
        public int? CleanlinessRating { get; set; }
        public int? ValueRating { get; set; }
        public int? RespectForCarRating { get; set; }
        public int? TimelinessRating { get; set; }

        public string? Comment { get; set; }
        public string? Response { get; set; }

        public bool IsPublic { get; set; }
        public bool IsFlagged { get; set; }
        public string? FlagReason { get; set; }

        public DateTime CreatedAt { get; set; }
    }

    public class Message
    {
        public Guid Id { get; set; }
        public Guid BookingId { get; set; }
        public virtual Booking Booking { get; set; } = null!;

        public Guid SenderId { get; set; }
        public virtual User Sender { get; set; } = null!;

        public Guid ReceiverId { get; set; }
        public virtual User Receiver { get; set; } = null!;

        public string Content { get; set; } = string.Empty;
        public MessageType Type { get; set; }
        public string? AttachmentUrl { get; set; }

        public bool IsRead { get; set; }
        public DateTime? ReadAt { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class Notification
    {
        public Guid Id { get; set; }
        public Guid UserId { get; set; }
        public virtual User User { get; set; } = null!;

        public string Title { get; set; } = string.Empty;
        public string Message { get; set; } = string.Empty;
        public NotificationType Type { get; set; }

        public Guid? RelatedEntityId { get; set; }
        public string? RelatedEntityType { get; set; }

        public bool IsRead { get; set; }
        public DateTime? ReadAt { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}
