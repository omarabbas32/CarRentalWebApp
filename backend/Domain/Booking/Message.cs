namespace Domain.Booking
{
    /// <summary>
    /// A message in a booking's thread.
    /// </summary>
    /// <remarks>
    /// Threads are booking-scoped: a conversation belongs to exactly one booking and has
    /// exactly two sides, its renter and its owner. That is what makes authorization a
    /// single lookup instead of a blocking-and-abuse problem.
    ///
    /// <see cref="ReceiverId"/> is redundant with the booking — it is always the other
    /// participant — but it is stored anyway so an unread count is one indexed predicate
    /// rather than a join, and it is always derived on the server, never accepted from a
    /// client that could point it at a stranger.
    /// </remarks>
    public class Message
    {
        public Guid Id { get; set; }

        public Guid BookingId { get; set; }
        public virtual Booking Booking { get; set; } = null!;

        public Guid SenderId { get; set; }
        public virtual Domain.User.User Sender { get; set; } = null!;

        public Guid ReceiverId { get; set; }
        public virtual Domain.User.User Receiver { get; set; } = null!;

        public string Content { get; set; } = string.Empty;

        public DateTime SentAt { get; set; }

        /// <summary>Null until the receiver opens the thread.</summary>
        public DateTime? ReadAt { get; set; }
    }
}
