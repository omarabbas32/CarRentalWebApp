namespace Application.Cars.Queries.SearchCars;

/// <summary>
/// Validation result and parsed filter criteria for car search
/// </summary>
public class SearchFilters
{
    public bool IsValid { get; set; }
    public string? ValidationMessage { get; set; }

    // Location filters
    public string? City { get; set; }
    public string? State { get; set; }

    // Date range
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }

    // Price range
    public decimal? MinPrice { get; set; }
    public decimal? MaxPrice { get; set; }

    // Category filter
    public string? Category { get; set; }

    // Features filter
    public List<string> Features { get; set; } = new();

    // Rating filter
    public double? MinRating { get; set; }

    // Pagination
    public int PageNumber { get; set; } = 1;
    public int PageSize { get; set; } = 20;

    public static SearchFilters Validate(SearchCarsQuery query)
    {
        var startDate = query.StartDate.Kind == DateTimeKind.Utc
            ? query.StartDate
            : DateTime.SpecifyKind(query.StartDate, DateTimeKind.Utc);
        var endDate = query.EndDate.Kind == DateTimeKind.Utc
            ? query.EndDate
            : DateTime.SpecifyKind(query.EndDate, DateTimeKind.Utc);

        var filters = new SearchFilters
        {
            City = query.City,
            State = query.State,
            StartDate = startDate,
            EndDate = endDate,
            MinPrice = query.MinPrice,
            MaxPrice = query.MaxPrice,
            Category = query.Category,
            Features = query.Features ?? new(),
            MinRating = query.MinRating,
            PageNumber = query.PageNumber,
            PageSize = query.PageSize
        };

        // Validate dates
        if (filters.StartDate >= filters.EndDate)
        {
            filters.IsValid = false;
            filters.ValidationMessage = "Start date must be before end date";
            return filters;
        }

        // Validate date range (max 365 days)
        var daysDifference = (query.EndDate - query.StartDate).TotalDays;
        if (daysDifference > 365)
        {
            filters.IsValid = false;
            filters.ValidationMessage = "Search period cannot exceed 365 days";
            return filters;
        }

        // Validate price range
        if (query.MinPrice.HasValue && query.MaxPrice.HasValue && query.MinPrice > query.MaxPrice)
        {
            filters.IsValid = false;
            filters.ValidationMessage = "Minimum price cannot be greater than maximum price";
            return filters;
        }

        // Validate pagination
        if (query.PageNumber < 1)
        {
            filters.PageNumber = 1;
        }

        if (query.PageSize < 1 || query.PageSize > 100)
        {
            filters.PageSize = 20;
        }

        // Validate rating
        if (query.MinRating.HasValue && (query.MinRating < 0 || query.MinRating > 5))
        {
            filters.IsValid = false;
            filters.ValidationMessage = "Minimum rating must be between 0 and 5";
            return filters;
        }

        filters.IsValid = true;
        return filters;
    }
}
