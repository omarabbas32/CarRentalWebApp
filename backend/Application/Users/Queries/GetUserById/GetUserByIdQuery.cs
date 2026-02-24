using MediatR;
using Application.Users.Common;

namespace Application.Users.Queries.GetUserById;

public record GetUserByIdQuery(Guid Id) : IRequest<UserDto>;
