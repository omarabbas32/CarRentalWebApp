using FluentValidation;

namespace Application.Cars.Commands.UpdateCar;

public class UpdateCarCommandValidator : AbstractValidator<UpdateCarCommand>
{
    public UpdateCarCommandValidator()
    {
        RuleFor(x => x.Id).NotEmpty();
        RuleFor(x => x.Make).NotEmpty().MaximumLength(100);
        RuleFor(x => x.Model).NotEmpty().MaximumLength(100);
        RuleFor(x => x.Year).InclusiveBetween(1900, DateTime.UtcNow.Year + 1);
        RuleFor(x => x.Color).NotEmpty();
        RuleFor(x => x.LicensePlate).NotEmpty().MaximumLength(20);
        RuleFor(x => x.VIN).NotEmpty().MaximumLength(17);
        RuleFor(x => x.Seats).GreaterThan(0);
        RuleFor(x => x.Doors).GreaterThan(0);
        RuleFor(x => x.PricePerDay).GreaterThan(0);
        RuleFor(x => x.SecurityDeposit).GreaterThanOrEqualTo(0);
        RuleFor(x => x.LocationAddress).NotEmpty();
        RuleFor(x => x.LocationCity).NotEmpty();
        RuleFor(x => x.LocationState).NotEmpty();
        RuleFor(x => x.Location).NotNull();
    }
}
