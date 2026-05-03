using MediatR;
using Application.Cars.Common;

namespace Application.Cars.Queries.SearchCars;

public record SearchCarsQuery(
    string? City,
    string? State,
    DateTime StartDate,
    DateTime EndDate,
    decimal? MinPrice,
    decimal? MaxPrice,
    string? Category,
    List<string>? Features,
    double? MinRating,
    int PageNumber = 1,
    int PageSize = 20
) : IRequest<SearchCarsResult>;

public record SearchCarsResult(
    List<CarSearchResultDto> Cars,
    int TotalCount,
    int PageNumber,
    int PageSize,
    int TotalPages
);
