using MediatR;

namespace Application.Cars.Commands.DeleteCar;

public record DeleteCarCommand(Guid Id) : IRequest;
