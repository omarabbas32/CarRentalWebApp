using MediatR;
using Domain.User;

namespace Application.Users.Commands.CreateUser;

public record CreateUserCommand(
    string Email,
    string PhoneNumber,
    string FirstName,
    string LastName,
    UserRole Role
) : IRequest<Guid>;
