using FluentValidation;

namespace Application.Cars.Commands.CreateCar;

public class CreateCarCommandValidator : AbstractValidator<CreateCarCommand>
{
    public CreateCarCommandValidator()
    {
        RuleFor(v => v.Make)
            .NotEmpty().WithMessage("Make is required.")
            .MaximumLength(50).WithMessage("Make must not exceed 50 characters.");

        RuleFor(v => v.Model)
            .NotEmpty().WithMessage("Model is required.")
            .MaximumLength(50).WithMessage("Model must not exceed 50 characters.");

        RuleFor(v => v.Year)
            .InclusiveBetween(1900, DateTime.Now.Year + 1).WithMessage($"Year must be between 1900 and {DateTime.Now.Year + 1}.");

        RuleFor(v => v.Color)
            .NotEmpty().WithMessage("Color is required.");

        RuleFor(v => v.LicensePlate)
            .NotEmpty().WithMessage("License plate is required.")
            .MaximumLength(20).WithMessage("License plate must not exceed 20 characters.");

        RuleFor(v => v.VIN)
            .NotEmpty().WithMessage("VIN is required.")
            .Length(17).WithMessage("VIN must be exactly 17 characters.")
            .Matches("^[A-HJ-NPR-Z0-9]*$").WithMessage("VIN must contain only valid characters.");

        RuleFor(v => v.Seats)
            .InclusiveBetween(1, 20).WithMessage("Seats must be between 1 and 20.");

        RuleFor(v => v.Doors)
            .InclusiveBetween(1, 10).WithMessage("Doors must be between 1 and 10.");

        RuleFor(v => v.Mileage)
            .GreaterThanOrEqualTo(0).WithMessage("Mileage cannot be negative.");

        RuleFor(v => v.PricePerDay)
            .GreaterThan(0).WithMessage("Price per day must be greater than 0.");

        RuleFor(v => v.SecurityDeposit)
            .GreaterThanOrEqualTo(0).WithMessage("Security deposit cannot be negative.");

        RuleFor(v => v.LocationAddress)
            .NotEmpty().WithMessage("Location address is required.");

        RuleFor(v => v.LocationCity)
            .NotEmpty().WithMessage("Location city is required.");

        RuleFor(v => v.LocationState)
            .NotEmpty().WithMessage("Location state is required.");

        RuleFor(v => v.Transmission)
            .IsInEnum().WithMessage("A valid transmission type must be selected.");

        RuleFor(v => v.FuelType)
            .IsInEnum().WithMessage("A valid fuel type must be selected.");

        RuleFor(v => v.Category)
            .IsInEnum().WithMessage("A valid car category must be selected.");
    }
}
