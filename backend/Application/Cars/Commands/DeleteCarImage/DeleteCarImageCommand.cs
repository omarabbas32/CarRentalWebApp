using Application.Common.Security;
using MediatR;

namespace Application.Cars.Commands.DeleteCarImage;

/// <summary>
/// Was unauthenticated — any caller could delete any photo from any car. The
/// handler now resolves the image's car and checks ownership.
/// </summary>
[Authorize(Roles = "Owner,Admin,Staff")]
public record DeleteCarImageCommand(Guid ImageId) : IRequest<Unit>;
