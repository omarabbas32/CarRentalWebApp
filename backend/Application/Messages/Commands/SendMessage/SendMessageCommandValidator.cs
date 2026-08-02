using FluentValidation;

namespace Application.Messages.Commands.SendMessage;

public class SendMessageCommandValidator : AbstractValidator<SendMessageCommand>
{
    public SendMessageCommandValidator()
    {
        RuleFor(v => v.BookingId)
            .NotEmpty().WithMessage("Booking is required.");

        RuleFor(v => v.Content)
            .NotEmpty().WithMessage("Write a message first.")
            .MaximumLength(2000).WithMessage("Messages are limited to 2000 characters.");
    }
}
