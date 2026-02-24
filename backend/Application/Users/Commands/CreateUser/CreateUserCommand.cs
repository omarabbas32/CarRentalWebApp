using MediatR;
using Domain.User;

namespace Application.Users.Commands.CreateUser;

public record CreateUserCommand(
    string Email,
    string Password,
    string PhoneNumber,
    string FirstName,
    string LastName,
    UserRole Role
) : IRequest<Guid>;
