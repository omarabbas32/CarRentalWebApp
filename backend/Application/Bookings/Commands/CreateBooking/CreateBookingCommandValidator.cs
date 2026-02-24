using FluentValidation;

namespace Application.Bookings.Commands.CreateBooking;

public class CreateBookingCommandValidator : AbstractValidator<CreateBookingCommand>
{
    public CreateBookingCommandValidator()
    {
        RuleFor(v => v.CarId)
            .NotEmpty().WithMessage("Car ID is required.");

        RuleFor(v => v.RenterId)
            .NotEmpty().WithMessage("Renter ID is required.");

        RuleFor(v => v.StartDate)
            .NotEmpty().WithMessage("Start date is required.")
            .GreaterThanOrEqualTo(DateTime.UtcNow.Date).WithMessage("Start date cannot be in the past.");

        RuleFor(v => v.EndDate)
            .NotEmpty().WithMessage("End date is required.")
            .GreaterThan(v => v.StartDate).WithMessage("End date must be after start date.");
    }
}
