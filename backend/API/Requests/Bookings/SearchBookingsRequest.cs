using Domain.Booking;

namespace API.Requests.Bookings;

public class SearchBookingsRequest
{
    public Guid? RenterId { get; set; }
    public Guid? OwnerId { get; set; }
    public BookingStatus? Status { get; set; }
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public int PageNumber { get; set; } = 1;
    public int PageSize { get; set; } = 20;
}
