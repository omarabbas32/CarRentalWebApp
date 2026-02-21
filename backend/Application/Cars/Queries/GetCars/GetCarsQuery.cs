using MediatR;
using Application.Cars.Common;

namespace Application.Cars.Queries.GetCars;

public record GetCarsQuery : IRequest<List<CarDto>>;
