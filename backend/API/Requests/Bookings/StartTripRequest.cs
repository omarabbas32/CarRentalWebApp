namespace API.Requests.Bookings;

public class StartTripRequest
{
    public DateTime ActualPickupDateTime { get; set; }
    public int StartMileage { get; set; }
    public int FuelLevel { get; set; }
    public int Cleanliness { get; set; }
    public bool HasDamage { get; set; }
    public string? DamageDescription { get; set; }
}
