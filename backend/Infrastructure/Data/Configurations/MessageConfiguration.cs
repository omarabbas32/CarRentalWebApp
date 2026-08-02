using Domain.Booking;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Infrastructure.Data.Configurations
{
    public class MessageConfiguration : IEntityTypeConfiguration<Message>
    {
        public void Configure(EntityTypeBuilder<Message> builder)
        {
            builder.HasKey(m => m.Id);

            // A message has no life outside its booking.
            builder.HasOne(m => m.Booking)
                .WithMany(b => b.Messages)
                .HasForeignKey(m => m.BookingId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.HasOne(m => m.Sender)
                .WithMany(u => u.SentMessages)
                .HasForeignKey(m => m.SenderId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.HasOne(m => m.Receiver)
                .WithMany(u => u.ReceivedMessages)
                .HasForeignKey(m => m.ReceiverId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.Property(m => m.Content).HasMaxLength(2000).IsRequired();

            // Reading one thread, newest first.
            builder.HasIndex(m => new { m.BookingId, m.SentAt });

            // The unread badge, which is read on nearly every page.
            builder.HasIndex(m => new { m.ReceiverId, m.ReadAt });
        }
    }
}
