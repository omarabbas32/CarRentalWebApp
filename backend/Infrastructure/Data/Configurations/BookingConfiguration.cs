using Domain.Booking;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Infrastructure.Data.Configurations
{
    public class BookingConfiguration : IEntityTypeConfiguration<Booking>
    {
        public void Configure(EntityTypeBuilder<Booking> builder)
        {
            builder.HasKey(b => b.Id);

            builder.HasOne(b => b.Car)
                .WithMany(c => c.Bookings)
                .HasForeignKey(b => b.CarId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.HasOne(b => b.Renter)
                .WithMany(u => u.RenterBookings)
                .HasForeignKey(b => b.RenterId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.HasOne(b => b.Owner)
                .WithMany(u => u.OwnerBookings)
                .HasForeignKey(b => b.OwnerId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.Property(b => b.PricePerDay).HasPrecision(18, 2);
            builder.Property(b => b.SubTotal).HasPrecision(18, 2);
            builder.Property(b => b.ServiceFee).HasPrecision(18, 2);
            builder.Property(b => b.TaxAmount).HasPrecision(18, 2);
            builder.Property(b => b.SecurityDeposit).HasPrecision(18, 2);
            builder.Property(b => b.TotalAmount).HasPrecision(18, 2);
            builder.Property(b => b.ExtraMileageCharge).HasPrecision(18, 2);
            builder.Property(b => b.RefundAmount).HasPrecision(18, 2);

            builder.HasOne(b => b.PickupInspection)
                .WithOne()
                .HasForeignKey<Booking>("PickupInspectionId")
                .OnDelete(DeleteBehavior.SetNull);

            builder.HasOne(b => b.ReturnInspection)
                .WithOne()
                .HasForeignKey<Booking>("ReturnInspectionId")
                .OnDelete(DeleteBehavior.SetNull);
        }
    }
}
