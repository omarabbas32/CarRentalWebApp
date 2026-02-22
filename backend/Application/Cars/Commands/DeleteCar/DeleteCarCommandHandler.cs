using MediatR;
using Application.Common.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace Application.Cars.Commands.DeleteCar;

public class DeleteCarCommandHandler : IRequestHandler<DeleteCarCommand>
{
    private readonly IAppDbContext _context;

    public DeleteCarCommandHandler(IAppDbContext context)
    {
        _context = context;
    }

    public async Task Handle(DeleteCarCommand request, CancellationToken cancellationToken)
    {
        var car = await _context.Cars
            .FirstOrDefaultAsync(c => c.Id == request.Id, cancellationToken);

        if (car == null)
        {
            throw new Exception($"Car with ID {request.Id} not found.");
        }

        
        _context.Cars.Remove(car);
        await _context.SaveChangesAsync(cancellationToken);
    }
}
