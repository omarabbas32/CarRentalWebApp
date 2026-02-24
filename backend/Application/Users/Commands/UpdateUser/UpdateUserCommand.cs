using MediatR;

namespace Application.Users.Commands.UpdateUser;

public record UpdateUserCommand(
    Guid Id,
    string Email,
    string PhoneNumber,
    string FirstName,
    string LastName
) : IRequest<Unit>;
