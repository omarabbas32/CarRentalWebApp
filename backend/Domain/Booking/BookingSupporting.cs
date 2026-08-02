namespace Domain.Booking
{
    // `Payment` is still a placeholder — nothing writes to it and there are no payment
    // endpoints. `Review` and `Message` used to live here too; they are real entities now
    // and have their own files.

    public class Payment
    {
        public Guid Id { get; set; }
        public decimal Amount { get; set; }
        public DateTime PaymentDate { get; set; }
    }

    /// <summary>
    /// A car's coordinates. Not a placeholder — mapped as an owned type by
    /// <c>CarConfiguration.OwnsOne(c => c.Location)</c>.
    /// </summary>
    public class Point
    {
        public double Lat { get; set; }
        public double Lng { get; set; }
    }
}
