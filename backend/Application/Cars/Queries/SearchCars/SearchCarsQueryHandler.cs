using System.Linq;
using Application.Common.Interfaces;
using Application.Cars.Common;
using Application.Common.Exceptions;
using Domain.Booking;
using Domain.Car;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Cars.Queries.SearchCars;

public class SearchCarsQueryHandler : IRequestHandler<SearchCarsQuery, SearchCarsResult>
{
    private readonly IAppDbContext _context;

    public SearchCarsQueryHandler(IAppDbContext context)
    {
        _context = context;
    }

    public async Task<SearchCarsResult> Handle(SearchCarsQuery request, CancellationToken cancellationToken)
    {
        var filters = SearchFilters.Validate(request);
        if (!filters.IsValid)
        {
            throw new ValidationException(new[] { new FluentValidation.Results.ValidationFailure("SearchCarsQuery", filters.ValidationMessage ?? "Invalid search filters") });
        }

        var normalizedCity = filters.City?.Trim().ToLowerInvariant();
        var normalizedState = filters.State?.Trim().ToLowerInvariant();
        var normalizedCategory = filters.Category?.Trim();
        var selectedFeatures = new HashSet<string>(filters.Features.Select(f => f.Trim().ToLowerInvariant()));

        var hasCategoryFilter = false;
        var categoryFilter = default(CarCategory);

        if (!string.IsNullOrWhiteSpace(normalizedCategory))
        {
            if (!Enum.TryParse<CarCategory>(normalizedCategory, true, out categoryFilter))
            {
                throw new ValidationException(new[] { new FluentValidation.Results.ValidationFailure("Category", "Invalid car category.") });
            }
            hasCategoryFilter = true;
        }

        var blockedCarIds = _context.CarAvailabilities
            .Where(a => !a.IsAvailable && a.StartDate < filters.EndDate && a.EndDate > filters.StartDate)
            .Select(a => a.CarId);

        var bookedCarIds = _context.Bookings
            .Where(b => (b.Status == BookingStatus.Confirmed || b.Status == BookingStatus.InProgress)
                && b.StartDate < filters.EndDate
                && b.EndDate > filters.StartDate)
            .Select(b => b.CarId);

        var query = _context.Cars
            .AsNoTracking()
            .Where(c => c.IsActive && c.IsAvailable)
            .Where(c => string.IsNullOrEmpty(normalizedCity) || c.LocationCity.ToLower() == normalizedCity)
            .Where(c => string.IsNullOrEmpty(normalizedState) || c.LocationState.ToLower() == normalizedState)
            .Where(c => !filters.MinPrice.HasValue || c.PricePerDay >= filters.MinPrice.Value)
            .Where(c => !filters.MaxPrice.HasValue || c.PricePerDay <= filters.MaxPrice.Value)
            .Where(c => !filters.MinRating.HasValue || c.AverageRating >= filters.MinRating.Value)
            .Where(c => !blockedCarIds.Contains(c.Id))
            .Where(c => !bookedCarIds.Contains(c.Id));

        if (hasCategoryFilter)
        {
            query = query.Where(c => c.Category == categoryFilter);
        }

        if (selectedFeatures.Contains("gps"))
        {
            query = query.Where(c => c.HasGPS);
        }

        if (selectedFeatures.Contains("bluetooth"))
        {
            query = query.Where(c => c.HasBluetooth);
        }

        if (selectedFeatures.Contains("usb") || selectedFeatures.Contains("usbcharging") || selectedFeatures.Contains("usb charging"))
        {
            query = query.Where(c => c.HasUSBCharging);
        }

        if (selectedFeatures.Contains("childseat") || selectedFeatures.Contains("child seat"))
        {
            query = query.Where(c => c.HasChildSeat);
        }

        if (selectedFeatures.Contains("airconditioning") || selectedFeatures.Contains("ac"))
        {
            query = query.Where(c => c.HasAirConditioning);
        }

        if (selectedFeatures.Contains("backupcamera") || selectedFeatures.Contains("backup camera"))
        {
            query = query.Where(c => c.HasBackupCamera);
        }

        var totalCount = await query.CountAsync(cancellationToken);

        var cars = await query
            .OrderByDescending(c => c.AverageRating)
            .ThenBy(c => c.PricePerDay)
            .Skip((filters.PageNumber - 1) * filters.PageSize)
            .Take(filters.PageSize)
            .Select(car => new CarSearchResultDto(
                car.Id,
                car.OwnerId,
                car.Make,
                car.Model,
                car.Year,
                car.Color,
                car.LicensePlate,
                car.Transmission,
                car.FuelType,
                car.Seats,
                car.Doors,
                car.Category,
                car.HasGPS,
                car.HasBluetooth,
                car.HasUSBCharging,
                car.HasChildSeat,
                car.HasAirConditioning,
                car.HasBackupCamera,
                car.LocationAddress,
                car.LocationCity,
                car.LocationState,
                car.PricePerDay,
                car.PricePerWeek,
                car.PricePerMonth,
                car.SecurityDeposit,
                car.DailyMileageLimit,
                car.ExtraMileageCharge,
                car.AverageRating,
                car.TotalReviews,
                car.TotalTrips,
                car.IsAvailable,
                car.CreatedAt,
                car.Images.OrderByDescending(i => i.IsPrimary).ThenBy(i => i.DisplayOrder).Select(i => i.ImageUrl).ToList()
            ))
            .ToListAsync(cancellationToken);

        var totalPages = (int)Math.Ceiling(totalCount / (double)filters.PageSize);

        return new SearchCarsResult(cars, totalCount, filters.PageNumber, filters.PageSize, totalPages);
    }
}
