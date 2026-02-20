using Domain.Booking;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Infrastructure.Data.Configurations
{
    public class TripInspectionConfiguration : IEntityTypeConfiguration<TripInspection>
    {
        public void Configure(EntityTypeBuilder<TripInspection> builder)
        {
            builder.HasKey(ti => ti.Id);

            builder.HasOne(ti => ti.Booking)
                .WithMany()
                .HasForeignKey(ti => ti.BookingId)
                .OnDelete(DeleteBehavior.Cascade);
        }
    }
}
