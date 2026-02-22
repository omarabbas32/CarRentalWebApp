using Domain.Car;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Infrastructure.Data.Configurations
{
    public class CarConfiguration : IEntityTypeConfiguration<Car>
    {
        public void Configure(EntityTypeBuilder<Car> builder)
        {
            builder.HasKey(c => c.Id);

            builder.HasOne(c => c.Owner)
                .WithMany(u => u.OwnedCars)
                .HasForeignKey(c => c.OwnerId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.Property(c => c.PricePerDay).HasPrecision(18, 2);
            builder.Property(c => c.PricePerWeek).HasPrecision(18, 2);
            builder.Property(c => c.PricePerMonth).HasPrecision(18, 2);
            builder.Property(c => c.SecurityDeposit).HasPrecision(18, 2);
            builder.Property(c => c.ExtraMileageCharge).HasPrecision(18, 2);

            builder.OwnsOne(c => c.Location);
        }
    }
}
