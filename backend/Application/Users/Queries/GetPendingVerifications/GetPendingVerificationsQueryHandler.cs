using MediatR;
using Application.Common.Interfaces;
using Microsoft.EntityFrameworkCore;
using Domain.User;

namespace Application.Users.Queries.GetPendingVerifications;

public class GetPendingVerificationsQueryHandler : IRequestHandler<GetPendingVerificationsQuery, List<PendingVerificationDto>>
{
    private readonly IAppDbContext _context;

    public GetPendingVerificationsQueryHandler(IAppDbContext context)
    {
        _context = context;
    }

    public async Task<List<PendingVerificationDto>> Handle(GetPendingVerificationsQuery request, CancellationToken cancellationToken)
    {
        var pendingUsers = await _context.Users
            .Include(u => u.Verification)
            .Where(u => u.Verification != null && 
                       (u.Verification.GovernmentIdStatus == VerificationStatus.Pending || 
                        u.Verification.DriverLicenseStatus == VerificationStatus.Pending))
            .Select(u => new PendingVerificationDto
            {
                UserId = u.Id,
                FullName = $"{u.FirstName} {u.LastName}",
                Email = u.Email,
                GovernmentIdImageUrl = u.Verification!.GovernmentIdImageUrl,
                GovernmentIdType = u.Verification.GovernmentIdType,
                GovernmentIdStatus = u.Verification.GovernmentIdStatus,
                DriverLicenseFrontImageUrl = u.Verification.DriverLicenseFrontImageUrl,
                DriverLicenseBackImageUrl = u.Verification.DriverLicenseBackImageUrl,
                DriverLicenseStatus = u.Verification.DriverLicenseStatus,
                DriverLicenseExpiryDate = u.Verification.DriverLicenseExpiryDate
            })
            .ToListAsync(cancellationToken);

        return pendingUsers;
    }
}
