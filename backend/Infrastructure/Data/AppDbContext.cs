using Microsoft.EntityFrameworkCore;
using Domain.Car;
using Domain.Booking;
using Domain.User;

namespace Infrastructure.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
        {
        }

        // Car Domain
        public DbSet<Car> Cars { get; set; }
        public DbSet<CarImage> CarImages { get; set; }
        public DbSet<CarAvailability> CarAvailabilities { get; set; }

        // Booking Domain
        public DbSet<Booking> Bookings { get; set; }
        public DbSet<TripInspection> TripInspections { get; set; }
        public DbSet<InspectionPhoto> InspectionPhotos { get; set; }

        // User Domain
        public DbSet<User> Users { get; set; }
        public DbSet<UserVerification> UserVerifications { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Car configuration
            modelBuilder.Entity<Car>()
                .HasOne(c => c.Owner)
                .WithMany(u => u.OwnedCars)
                .HasForeignKey(c => c.OwnerId)
                .OnDelete(DeleteBehavior.Restrict);

            // Booking configuration
            modelBuilder.Entity<Booking>()
                .HasOne(b => b.Car)
                .WithMany(c => c.Bookings)
                .HasForeignKey(b => b.CarId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Booking>()
                .HasOne(b => b.Renter)
                .WithMany(u => u.RenterBookings)
                .HasForeignKey(b => b.RenterId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Booking>()
                .HasOne(b => b.Owner)
                .WithMany(u => u.OwnerBookings)
                .HasForeignKey(b => b.OwnerId)
                .OnDelete(DeleteBehavior.Restrict);

            // TripInspection configuration
            modelBuilder.Entity<TripInspection>()
                .HasOne(ti => ti.Booking)
                .WithMany()
                .HasForeignKey(ti => ti.BookingId)
                .OnDelete(DeleteBehavior.Cascade);

            // UserVerification configuration (One-to-One)
            modelBuilder.Entity<UserVerification>()
                .HasOne(uv => uv.User)
                .WithOne(u => u.Verification)
                .HasForeignKey<UserVerification>(uv => uv.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            // Precision for decimals
            foreach (var property in modelBuilder.Model.GetEntityTypes()
                .SelectMany(t => t.GetProperties())
                .Where(p => p.ClrType == typeof(decimal) || p.ClrType == typeof(decimal?)))
            {
                property.SetPrecision(18);
                property.SetScale(2);
            }
        }
    }
}