using MediatR;
using Application.Common.Interfaces;
using Application.Common.Exceptions;
using Domain.User;
using Microsoft.EntityFrameworkCore;

namespace Application.Users.Commands.DeleteUser;

public class DeleteUserCommandHandler : IRequestHandler<DeleteUserCommand, Unit>
{
    private readonly IAppDbContext _context;

    public DeleteUserCommandHandler(IAppDbContext context)
    {
        _context = context;
    }

    public async Task<Unit> Handle(DeleteUserCommand request, CancellationToken cancellationToken)
    {
        var user = await _context.Users
            .FirstOrDefaultAsync(u => u.Id == request.Id, cancellationToken);

        if (user == null)
            throw new NotFoundException(nameof(User), request.Id);

        user.Status = UserStatus.Inactive;
        user.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);

        return Unit.Value;
    }
}
