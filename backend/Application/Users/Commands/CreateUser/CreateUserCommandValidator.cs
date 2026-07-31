using FluentValidation;

namespace Application.Users.Commands.CreateUser;

public class CreateUserCommandValidator : AbstractValidator<CreateUserCommand>
{
    public CreateUserCommandValidator()
    {
        RuleFor(x => x.Email).NotEmpty().EmailAddress();
        RuleFor(x => x.PhoneNumber).NotEmpty().MaximumLength(20);
        RuleFor(x => x.FirstName).NotEmpty().MaximumLength(50);
        RuleFor(x => x.LastName).NotEmpty().MaximumLength(50);

        // There was no password rule here at all, while `RegisterCommand`
        // enforces five. The gap mattered most on exactly the accounts this
        // endpoint creates: it is the only way to provision Admin and Staff.
        //
        // Kept character-for-character identical to RegisterCommandValidator —
        // the special-character class included — so the two cannot drift into
        // accepting different passwords.
        RuleFor(x => x.Password)
            .NotEmpty().WithMessage("Password is required.")
            .MinimumLength(8).WithMessage("Password must be at least 8 characters long.")
            .Matches(@"[A-Z]").WithMessage("Password must contain at least one uppercase letter.")
            .Matches(@"[a-z]").WithMessage("Password must contain at least one lowercase letter.")
            .Matches(@"[0-9]").WithMessage("Password must contain at least one number.")
            .Matches(@"[\^$*.\[\]{}()?\-""!@#%&/\\,><':;|_~`]").WithMessage("Password must contain at least one special character.");

        // Any role is legitimate here — provisioning Staff and Admin is the
        // point of the endpoint. The control is the [Authorize] attribute on
        // the command, not the value.
        RuleFor(x => x.Role).IsInEnum();
    }
}
