using MediatR;

namespace Application.Cars.Commands.DeleteCarImage;

public record DeleteCarImageCommand(Guid ImageId) : IRequest<Unit>;
