namespace API.Requests.Bookings;

public class EndTripRequest
{
    public DateTime ActualReturnDateTime { get; set; }
    public int EndMileage { get; set; }
    public int FuelLevel { get; set; }
    public int Cleanliness { get; set; }
    public bool HasDamage { get; set; }
    public string? DamageDescription { get; set; }
}
