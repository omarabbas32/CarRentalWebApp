using MediatR;
using Microsoft.AspNetCore.Http;
using Domain.User;

namespace Application.Users.Commands.UploadVerificationDocument;

public record UploadVerificationDocumentCommand(
    Guid UserId,
    IFormFile File,
    VerificationDocumentType DocumentType,
    GovernmentIdType? IdType = null
) : IRequest<string>;
