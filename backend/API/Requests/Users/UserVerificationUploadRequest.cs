using Domain.User;
using Microsoft.AspNetCore.Http;

namespace API.Requests.Users;

public class UserVerificationUploadRequest
{
    public IFormFile File { get; set; } = null!;
    public VerificationDocumentType Type { get; set; }
    public GovernmentIdType? IdType { get; set; }
}
