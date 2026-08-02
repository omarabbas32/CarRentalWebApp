using Domain.Booking;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Infrastructure.Data.Configurations
{
    public class ReviewConfiguration : IEntityTypeConfiguration<Review>
    {
        public void Configure(EntityTypeBuilder<Review> builder)
        {
            builder.HasKey(r => r.Id);

            builder.HasOne(r => r.Booking)
                .WithMany(b => b.Reviews)
                .HasForeignKey(r => r.BookingId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.HasOne(r => r.Reviewer)
                .WithMany(u => u.GivenReviews)
                .HasForeignKey(r => r.ReviewerId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.HasOne(r => r.Reviewee)
                .WithMany(u => u.ReceivedReviews)
                .HasForeignKey(r => r.RevieweeId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.Property(r => r.Comment).HasMaxLength(2000);

            // One review per trip per direction. The handler checks first so the user gets
            // a 409 with a sentence, but this is the guarantee — two concurrent submissions
            // cannot both win.
            builder.HasIndex(r => new { r.BookingId, r.Type }).IsUnique();

            // Reading a user's reputation.
            builder.HasIndex(r => r.RevieweeId);
        }
    }
}
