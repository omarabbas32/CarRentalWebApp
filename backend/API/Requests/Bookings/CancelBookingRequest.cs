namespace API.Requests.Bookings;

public class CancelBookingRequest
{
    public Guid CancelledByUserId { get; set; }
    public string? CancellationReason { get; set; }
}
