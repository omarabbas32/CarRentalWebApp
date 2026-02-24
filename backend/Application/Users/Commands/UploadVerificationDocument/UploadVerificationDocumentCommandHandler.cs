using MediatR;
using Application.Common.Interfaces;
using Application.Common.Exceptions;
using Domain.User;
using Microsoft.EntityFrameworkCore;

namespace Application.Users.Commands.UploadVerificationDocument;

public class UploadVerificationDocumentCommandHandler : IRequestHandler<UploadVerificationDocumentCommand, string>
{
    private readonly IAppDbContext _context;
    private readonly ICloudinaryService _cloudinaryService;

    public UploadVerificationDocumentCommandHandler(IAppDbContext context, ICloudinaryService cloudinaryService)
    {
        _context = context;
        _cloudinaryService = cloudinaryService;
    }

    public async Task<string> Handle(UploadVerificationDocumentCommand request, CancellationToken cancellationToken)
    {
        var user = await _context.Users
            .Include(u => u.Verification)
            .FirstOrDefaultAsync(u => u.Id == request.UserId, cancellationToken);

        if (user == null)
            throw new NotFoundException(nameof(User), request.UserId);

        if (user.Verification == null)
        {
            user.Verification = new UserVerification { Id = Guid.NewGuid(), UserId = user.Id };
            _context.UserVerifications.Add(user.Verification);
        }

        var folder = $"users/{user.Id}/verification";
        var imageUrl = await _cloudinaryService.UploadImageAsync(request.File, folder);

        if (string.IsNullOrEmpty(imageUrl))
            throw new Exception("Document upload failed.");

        switch (request.DocumentType)
        {
            case VerificationDocumentType.GovernmentId:
                user.Verification.GovernmentIdImageUrl = imageUrl;
                user.Verification.GovernmentIdStatus = VerificationStatus.Pending;
                if (request.IdType.HasValue)
                {
                    user.Verification.GovernmentIdType = request.IdType.Value;
                }
                break;
            case VerificationDocumentType.DriverLicenseFront:
                user.Verification.DriverLicenseFrontImageUrl = imageUrl;
                user.Verification.DriverLicenseStatus = VerificationStatus.Pending;
                break;
            case VerificationDocumentType.DriverLicenseBack:
                user.Verification.DriverLicenseBackImageUrl = imageUrl;
                user.Verification.DriverLicenseStatus = VerificationStatus.Pending;
                break;
        }

        await _context.SaveChangesAsync(cancellationToken);

        return imageUrl;
    }
}
