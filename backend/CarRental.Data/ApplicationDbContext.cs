using Microsoft.EntityFrameworkCore;
using CarRental.Core.Models;

namespace CarRental.Data
{
    public class ApplicationDbContext : DbContext
    {
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
            : base(options)
        {
        }

        public DbSet<User> Users { get; set; } = null!;
        public DbSet<UserVerification> UserVerifications { get; set; } = null!;
        public DbSet<Car> Cars { get; set; } = null!;
        public DbSet<CarImage> CarImages { get; set; } = null!;
        public DbSet<CarAvailability> CarAvailabilities { get; set; } = null!;
        public DbSet<Booking> Bookings { get; set; } = null!;
        public DbSet<TripInspection> TripInspections { get; set; } = null!;
        public DbSet<InspectionPhoto> InspectionPhotos { get; set; } = null!;
        public DbSet<Payment> Payments { get; set; } = null!;
        public DbSet<Review> Reviews { get; set; } = null!;
        public DbSet<Message> Messages { get; set; } = null!;
        public DbSet<Notification> Notifications { get; set; } = null!;

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // User configuration
            modelBuilder.Entity<User>(entity =>
            {
                entity.HasIndex(u => u.Email).IsUnique();
                entity.HasIndex(u => u.PhoneNumber);
                entity.HasIndex(u => u.CreatedAt);
            });

            // UserVerification configuration
            modelBuilder.Entity<UserVerification>()
                .HasOne(uv => uv.User)
                .WithOne(u => u.Verification)
                .HasForeignKey<UserVerification>(uv => uv.UserId);

            // Car configuration
            modelBuilder.Entity<Car>(entity =>
            {
                entity.HasIndex(c => c.OwnerId);
                entity.HasIndex(c => c.Make);
                entity.HasIndex(c => c.Category);
                entity.HasIndex(c => c.IsAvailable);
                entity.HasIndex(c => c.IsActive);
                
                // Location Point configuration (PostGIS)
                entity.Property(c => c.Location).HasColumnType("geometry(Point, 4326)");
            });

            // Booking configuration
            modelBuilder.Entity<Booking>(entity =>
            {
                entity.HasIndex(b => b.CarId);
                entity.HasIndex(b => b.RenterId);
                entity.HasIndex(b => b.OwnerId);
                entity.HasIndex(b => b.Status);
                entity.HasIndex(b => new { b.StartDate, b.EndDate });

                // Relationships with User (Owner and Renter)
                entity.HasOne(b => b.Renter)
                    .WithMany(u => u.RenterBookings)
                    .HasForeignKey(b => b.RenterId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(b => b.Owner)
                    .WithMany(u => u.OwnerBookings)
                    .HasForeignKey(b => b.OwnerId)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            // TripInspection configuration
            modelBuilder.Entity<TripInspection>(entity =>
            {
                entity.Property(ti => ti.InspectionLocation).HasColumnType("geometry(Point, 4326)");
                
                // One-to-One relationships with Booking for Pickup and Return
                entity.HasOne(ti => ti.Booking)
                    .WithOne(b => b.PickupInspection)
                    .HasForeignKey<TripInspection>(ti => ti.BookingId)
                    .HasPrincipalKey<Booking>(b => b.Id)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            // Review configuration
            modelBuilder.Entity<Review>(entity =>
            {
                entity.HasOne(r => r.Reviewer)
                    .WithMany(u => u.GivenReviews)
                    .HasForeignKey(r => r.ReviewerId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(r => r.Reviewee)
                    .WithMany(u => u.ReceivedReviews)
                    .HasForeignKey(r => r.RevieweeId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(r => r.Booking)
                    .WithOne(b => b.Review)
                    .HasForeignKey<Review>(r => r.BookingId);
            });

            // Message configuration
            modelBuilder.Entity<Message>(entity =>
            {
                entity.HasIndex(m => new { m.ReceiverId, m.IsRead });
                entity.HasIndex(m => m.CreatedAt);

                entity.HasOne(m => m.Sender)
                    .WithMany(u => u.SentMessages)
                    .HasForeignKey(m => m.SenderId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(m => m.Receiver)
                    .WithMany(u => u.ReceivedMessages)
                    .HasForeignKey(m => m.ReceiverId)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            // Payment configuration
            modelBuilder.Entity<Payment>(entity =>
            {
                entity.HasIndex(p => p.BookingId);
                entity.HasIndex(p => p.Status);
                entity.HasIndex(p => p.StripePaymentIntentId);

                entity.HasOne(p => p.Payer)
                    .WithMany(u => u.Payments)
                    .HasForeignKey(p => p.PayerId)
                    .OnDelete(DeleteBehavior.Restrict);
            });
        }
    }
}
