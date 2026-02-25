using Domain.User;

namespace API.Requests.Users;

public record ProcessVerificationRequest(
    VerificationDocumentType DocumentType,
    VerificationStatus Status,
    string? Reason = null
);
