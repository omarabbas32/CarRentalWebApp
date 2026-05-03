namespace API.Requests.Cars;

public class SearchCarsRequest
{
    public string? City { get; set; }
    public string? State { get; set; }
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public decimal? MinPrice { get; set; }
    public decimal? MaxPrice { get; set; }
    public string? Category { get; set; }
    public List<string>? Features { get; set; }
    public double? MinRating { get; set; }
    public int PageNumber { get; set; } = 1;
    public int PageSize { get; set; } = 20;
}
