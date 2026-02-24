namespace API.Requests.Auth;

public class LogoutRequest
{
    public string RefreshToken { get; set; } = string.Empty;
    public string IpAddress { get; set; } = string.Empty;
}
