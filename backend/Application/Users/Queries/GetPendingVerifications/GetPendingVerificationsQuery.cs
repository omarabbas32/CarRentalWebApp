using Application.Common.Security;
using MediatR;

namespace Application.Users.Queries.GetPendingVerifications;

[Authorize(Roles = "Staff,Admin")]
public record GetPendingVerificationsQuery : IRequest<List<PendingVerificationDto>>;
