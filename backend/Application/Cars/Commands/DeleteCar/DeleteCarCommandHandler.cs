using MediatR;
using Application.Common.Interfaces;
using Microsoft.EntityFrameworkCore;
using Application.Common.Exceptions;
using Domain.User;

namespace Application.Cars.Commands.DeleteCar;

public class DeleteCarCommandHandler : IRequestHandler<DeleteCarCommand>
{
    private readonly IAppDbContext _context;
    private readonly ICurrentUserService _currentUserService;

    public DeleteCarCommandHandler(IAppDbContext context, ICurrentUserService currentUserService)
    {
        _context = context;
        _currentUserService = currentUserService;
    }

    public async Task Handle(DeleteCarCommand request, CancellationToken cancellationToken)
    {
        var car = await _context.Cars
            .FirstOrDefaultAsync(c => c.Id == request.Id, cancellationToken);

        if (car == null)
        {
            throw new Exception($"Car with ID {request.Id} not found.");
        }

        var currentUserRole = _currentUserService.Role;
        var currentUserId = _currentUserService.UserId;

        if (currentUserRole != UserRole.Admin.ToString() && currentUserRole != UserRole.Staff.ToString())
        {
            if (car.OwnerId.ToString() != currentUserId)
            {
                throw new ForbiddenAccessException();
            }
        }

        _context.Cars.Remove(car);
        await _context.SaveChangesAsync(cancellationToken);
    }
}
