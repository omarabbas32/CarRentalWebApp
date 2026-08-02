namespace Domain.Booking
{
    /// <summary>
    /// One party's verdict on a finished trip.
    /// </summary>
    /// <remarks>
    /// Reviews are two-sided: the renter rates the owner (and, through them, the car) and
    /// the owner rates the renter. Which direction a row is in is <see cref="Type"/>, and a
    /// unique index on (BookingId, Type) is what limits each side to one review per trip.
    ///
    /// There is deliberately no CarId here. It is reachable as <c>Booking.CarId</c> through
    /// an indexed foreign key, and duplicating it would be one more column to keep honest.
    /// </remarks>
    public class Review
    {
        public Guid Id { get; set; }

        public Guid BookingId { get; set; }
        public virtual Booking Booking { get; set; } = null!;

        public Guid ReviewerId { get; set; }
        public virtual Domain.User.User Reviewer { get; set; } = null!;

        public Guid RevieweeId { get; set; }
        public virtual Domain.User.User Reviewee { get; set; } = null!;

        public ReviewType Type { get; set; }

        /// <summary>1 to 5. Enforced by CreateReviewCommandValidator.</summary>
        public int Rating { get; set; }

        public string? Comment { get; set; }

        public DateTime CreatedAt { get; set; }
    }
}
