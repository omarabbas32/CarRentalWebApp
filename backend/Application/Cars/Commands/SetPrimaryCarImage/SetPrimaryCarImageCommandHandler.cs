using MediatR;
using Application.Common.Exceptions;
using Application.Common.Interfaces;
using Application.Common.Security;
using Domain.Car;
using Microsoft.EntityFrameworkCore;

namespace Application.Cars.Commands.SetPrimaryCarImage;

public class SetPrimaryCarImageCommandHandler : IRequestHandler<SetPrimaryCarImageCommand, Unit>
{
    private readonly IAppDbContext _context;
    private readonly ICurrentUserService _currentUserService;

    public SetPrimaryCarImageCommandHandler(
        IAppDbContext context,
        ICurrentUserService currentUserService)
    {
        _context = context;
        _currentUserService = currentUserService;
    }

    public async Task<Unit> Handle(SetPrimaryCarImageCommand request, CancellationToken cancellationToken)
    {
        var image = await _context.CarImages
            .FirstOrDefaultAsync(i => i.Id == request.ImageId, cancellationToken);

        if (image == null)
            throw new NotFoundException(nameof(CarImage), request.ImageId);

        var car = await _context.Cars
            .FirstOrDefaultAsync(c => c.Id == image.CarId, cancellationToken);

        if (car == null)
            throw new NotFoundException(nameof(Car), image.CarId);

        CarOwnership.EnsureCanManage(car, _currentUserService);

        // Nothing to do, and worth returning early: writing the same value back
        // would still bump the row and log a change that never happened.
        if (image.IsPrimary) return Unit.Value;

        var siblings = await _context.CarImages
            .Where(i => i.CarId == car.Id && i.IsPrimary)
            .ToListAsync(cancellationToken);

        // Exactly one cover. `UploadCarImageCommandHandler` maintains the same
        // invariant when a photo is uploaded as primary.
        foreach (var sibling in siblings)
        {
            sibling.IsPrimary = false;
        }

        image.IsPrimary = true;
        await _context.SaveChangesAsync(cancellationToken);

        return Unit.Value;
    }
}
