using Application.Common.Security;
using MediatR;

namespace Application.Users.Commands.DeleteUser;

[Authorize(Roles = "Admin")]
public record DeleteUserCommand(Guid Id) : IRequest<Unit>;
