using MediatR;
using Application.Common.Interfaces;
using Application.Common.Exceptions;
using Domain.User;
using Microsoft.EntityFrameworkCore;

namespace Application.Users.Commands.ProcessVerification;

public class ProcessVerificationCommandHandler : IRequestHandler<ProcessVerificationCommand, Unit>
{
    private readonly IAppDbContext _context;
    private readonly INotificationService _notifications;

    public ProcessVerificationCommandHandler(
        IAppDbContext context,
        INotificationService notifications)
    {
        _context = context;
        _notifications = notifications;
    }

    public async Task<Unit> Handle(ProcessVerificationCommand request, CancellationToken cancellationToken)
    {
        var user = await _context.Users
            .Include(u => u.Verification)
            .FirstOrDefaultAsync(u => u.Id == request.UserId, cancellationToken);

        if (user == null)
            throw new NotFoundException(nameof(User), request.UserId);

        if (user.Verification == null)
            throw new Exception("No verification record found for this user.");

        switch (request.DocumentType)
        {
            case VerificationDocumentType.GovernmentId:
                user.Verification.GovernmentIdStatus = request.Status;
                if (request.Status == VerificationStatus.Verified)
                {
                    user.IdentityVerified = true;
                }
                else if (request.Status == VerificationStatus.Rejected)
                {
                    user.IdentityVerified = false;
                }
                break;

            case VerificationDocumentType.DriverLicenseFront:
            case VerificationDocumentType.DriverLicenseBack:
                user.Verification.DriverLicenseStatus = request.Status;
                if (request.Status == VerificationStatus.Verified)
                {
                    // For license, we usually want both front and back to be checked or at least verified once
                    user.DriverLicenseVerified = true;
                }
                else if (request.Status == VerificationStatus.Rejected)
                {
                    user.DriverLicenseVerified = false;
                }
                break;
        }

        await _context.SaveChangesAsync(cancellationToken);

        // Only the two decided outcomes are worth telling someone about. Moving a document
        // back to Pending or Unverified is bookkeeping, not news.
        if (request.Status is VerificationStatus.Verified or VerificationStatus.Rejected)
        {
            var approved = request.Status == VerificationStatus.Verified;
            var document = request.DocumentType == VerificationDocumentType.GovernmentId
                ? "government ID"
                : "driving licence";

            await _notifications.NotifyAsync(
                user.Id,
                approved
                    ? NotificationType.VerificationApproved
                    : NotificationType.VerificationRejected,
                approved ? "Document approved" : "Document needs another look",
                approved
                    ? $"Your {document} has been verified."
                    : $"Your {document} wasn't accepted. You can upload a new photo.",
                null,
                cancellationToken);
        }

        return Unit.Value;
    }
}
