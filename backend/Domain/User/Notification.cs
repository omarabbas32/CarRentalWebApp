namespace Domain.User
{
    /// <summary>
    /// Something that happened which one particular user should know about.
    /// </summary>
    /// <remarks>
    /// Every notification is persisted before it is pushed, so the bell is correct for a
    /// user who was offline when the event fired and the feature degrades to plain REST if
    /// the SignalR connection is unavailable.
    ///
    /// The text field is <see cref="Body"/>, not "Message" — a <c>notification.Message</c>
    /// string sitting next to a <c>Message</c> entity is a trap for the next reader.
    /// </remarks>
    public class Notification
    {
        public Guid Id { get; set; }

        public Guid UserId { get; set; }
        public virtual User User { get; set; } = null!;

        public NotificationType Type { get; set; }

        public string Title { get; set; } = string.Empty;

        public string Body { get; set; } = string.Empty;

        /// <summary>
        /// The booking, car or user the notification is about, interpreted according to
        /// <see cref="Type"/>. A bare id rather than a link: routes are the client's
        /// business, and the domain should not know what Next.js calls its pages.
        /// </summary>
        public Guid? RelatedEntityId { get; set; }

        public DateTime? ReadAt { get; set; }

        public DateTime CreatedAt { get; set; }
    }
}
