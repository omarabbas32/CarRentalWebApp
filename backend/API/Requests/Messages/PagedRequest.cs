namespace API.Requests.Messages;

/// <summary>
/// Paging-only query binding, for the message endpoints that filter by nothing but the
/// caller's identity or a route id.
/// </summary>
public class PagedRequest
{
    public int PageNumber { get; set; } = 1;
    public int PageSize { get; set; } = 50;
}
