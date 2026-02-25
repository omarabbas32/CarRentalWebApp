using Application.Common.Security;
using Domain.User;
using MediatR;

namespace Application.Users.Commands.ProcessVerification;

[Authorize(Roles = "Staff,Admin")]
public record ProcessVerificationCommand(
    Guid UserId,
    VerificationDocumentType DocumentType,
    VerificationStatus Status,
    string? Reason = null
) : IRequest<Unit>;
