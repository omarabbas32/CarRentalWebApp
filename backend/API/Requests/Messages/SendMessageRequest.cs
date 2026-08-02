namespace API.Requests.Messages;

public class SendMessageRequest
{
    public Guid BookingId { get; set; }
    public string Content { get; set; } = string.Empty;
}
