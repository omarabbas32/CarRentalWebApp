using MediatR;
using Application.Common.Interfaces;
using Application.Common.Exceptions;
using Domain.User;
using Microsoft.EntityFrameworkCore;

namespace Application.Users.Commands.UpdateUser;

public class UpdateUserCommandHandler : IRequestHandler<UpdateUserCommand, Unit>
{
    private readonly IAppDbContext _context;

    public UpdateUserCommandHandler(IAppDbContext context)
    {
        _context = context;
    }

    public async Task<Unit> Handle(UpdateUserCommand request, CancellationToken cancellationToken)
    {
        var user = await _context.Users
            .FirstOrDefaultAsync(u => u.Id == request.Id, cancellationToken);

        if (user == null)
            throw new NotFoundException(nameof(User), request.Id);

        user.Email = request.Email;
        user.PhoneNumber = request.PhoneNumber;
        user.FirstName = request.FirstName;
        user.LastName = request.LastName;
        user.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);

        return Unit.Value;
    }
}
