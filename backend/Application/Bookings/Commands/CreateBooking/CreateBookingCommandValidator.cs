using FluentValidation;

namespace Application.Bookings.Commands.CreateBooking;

public class CreateBookingCommandValidator : AbstractValidator<CreateBookingCommand>
{
    public CreateBookingCommandValidator()
    {
        RuleFor(x => x.CarId).NotEmpty();
        RuleFor(x => x.RenterId).NotEmpty();
        
        RuleFor(x => x.StartDate)
            .NotEmpty()
            .GreaterThanOrEqualTo(DateTime.Today)
            .WithMessage("Start date must be today or in the future.");

        RuleFor(x => x.EndDate)
            .NotEmpty()
            .GreaterThan(x => x.StartDate)
            .WithMessage("End date must be after the start date.");
    }
}
