namespace Domain.User
{
    // Placeholder classes for models in other namespaces or not yet fully implemented
    
    public class Notification
    {
        public Guid Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Message { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
    }

    // Others like Payment, Message, Review are in Domain.Booking
}
