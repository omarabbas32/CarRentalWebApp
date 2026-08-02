namespace API.Requests.Notifications;

public class GetNotificationsRequest
{
    public bool UnreadOnly { get; set; }
    public int PageNumber { get; set; } = 1;
    public int PageSize { get; set; } = 20;
}
