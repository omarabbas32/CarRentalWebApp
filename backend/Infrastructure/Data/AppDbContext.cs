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
            modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);
        }
    }
}