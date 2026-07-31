using Microsoft.AspNetCore.Http;

namespace API.Requests.Bookings;

public class InspectionPhotoUploadRequest
{
    public IFormFile File { get; set; } = null!;

    /// <summary>Optional — "scratch on the passenger door", say.</summary>
    public string? Description { get; set; }
}
