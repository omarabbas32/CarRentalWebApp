namespace API.Requests.Bookings;

public class CreateBookingRequest
{
    public Guid CarId { get; set; }
    public Guid RenterId { get; set; }
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
}
