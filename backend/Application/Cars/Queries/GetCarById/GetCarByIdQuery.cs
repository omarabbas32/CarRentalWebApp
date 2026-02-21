using MediatR;
using Application.Cars.Common;

namespace Application.Cars.Queries.GetCarById;

public record GetCarByIdQuery(Guid Id) : IRequest<CarDto>;
