using FluentValidation;

namespace Application.Reviews.Commands.CreateReview;

public class CreateReviewCommandValidator : AbstractValidator<CreateReviewCommand>
{
    public CreateReviewCommandValidator()
    {
        RuleFor(v => v.BookingId)
            .NotEmpty().WithMessage("Booking is required.");

        RuleFor(v => v.Rating)
            .InclusiveBetween(1, 5).WithMessage("Choose a rating from 1 to 5 stars.");

        RuleFor(v => v.Comment)
            .MaximumLength(2000).WithMessage("Reviews are limited to 2000 characters.");
    }
}
