using MediatR;
using Application.Common.Interfaces;
using Application.Common.Exceptions;
using Application.Users.Common;
using Domain.User;
using Microsoft.EntityFrameworkCore;

namespace Application.Users.Queries.GetUserById;

public class GetUserByIdQueryHandler : IRequestHandler<GetUserByIdQuery, UserDto>
{
    private readonly IAppDbContext _context;

    public GetUserByIdQueryHandler(IAppDbContext context)
    {
        _context = context;
    }

    public async Task<UserDto> Handle(GetUserByIdQuery request, CancellationToken cancellationToken)
    {
        var user = await _context.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == request.Id, cancellationToken);

        if (user == null)
            throw new NotFoundException(nameof(User), request.Id);

        return new UserDto(
            user.Id,
            user.Email,
            user.PhoneNumber,
            user.FirstName,
            user.LastName,
            user.Role,
            user.Status,
            user.IdentityVerified,
            user.DriverLicenseVerified,
            user.CreatedAt
        );
    }
}
