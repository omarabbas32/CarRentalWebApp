namespace Domain.Booking
{
    // Placeholder types for models not yet fully implemented
    
    public class Payment
    {
        public Guid Id { get; set; }
        public decimal Amount { get; set; }
        public DateTime PaymentDate { get; set; }
    }

    public class Message
    {
        public Guid Id { get; set; }
        public string Content { get; set; } = string.Empty;
        public DateTime SentAt { get; set; }
    }

    public class Review
    {
        public Guid Id { get; set; }
        public int Rating { get; set; }
        public string? Comment { get; set; }
    }

    public class Point
    {
        public double Lat { get; set; }
        public double Lng { get; set; }
    }
}
