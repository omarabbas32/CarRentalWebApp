using Application.Common.Security;
using MediatR;

namespace Application.Cars.Commands.DeleteCar;

[Authorize(Roles = "Admin,Owner,Staff")]
public record DeleteCarCommand(Guid Id) : IRequest;
