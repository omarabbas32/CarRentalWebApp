using Domain.Car;
using Domain.Booking;

namespace API.Requests.Cars;

public class CreateCarRequest
{
    public string Make { get; set; } = string.Empty;
    public string Model { get; set; } = string.Empty;
    public int Year { get; set; }
    public string Color { get; set; } = string.Empty;
    public string LicensePlate { get; set; } = string.Empty;
    public string VIN { get; set; } = string.Empty;
    public TransmissionType Transmission { get; set; }
    public FuelType FuelType { get; set; }
    public int Seats { get; set; }
    public int Doors { get; set; }
    public int Mileage { get; set; }
    public CarCategory Category { get; set; }
    public bool HasGPS { get; set; }
    public bool HasBluetooth { get; set; }
    public bool HasUSBCharging { get; set; }
    public bool HasChildSeat { get; set; }
    public bool HasAirConditioning { get; set; }
    public bool HasBackupCamera { get; set; }
    public Point Location { get; set; } = null!;
    public string LocationAddress { get; set; } = string.Empty;
    public string LocationCity { get; set; } = string.Empty;
    public string LocationState { get; set; } = string.Empty;
    public decimal PricePerDay { get; set; }
    public decimal PricePerWeek { get; set; }
    public decimal PricePerMonth { get; set; }
    public decimal SecurityDeposit { get; set; }
    public int DailyMileageLimit { get; set; }
    public decimal ExtraMileageCharge { get; set; }
}
