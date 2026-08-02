using Domain.User;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Infrastructure.Data.Configurations
{
    public class NotificationConfiguration : IEntityTypeConfiguration<Notification>
    {
        public void Configure(EntityTypeBuilder<Notification> builder)
        {
            builder.HasKey(n => n.Id);

            // Cascade is the honest intent, though it never fires in practice: deleting a
            // user is a soft delete (DeleteUserCommandHandler sets Status = Inactive).
            builder.HasOne(n => n.User)
                .WithMany(u => u.Notifications)
                .HasForeignKey(n => n.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.Property(n => n.Title).HasMaxLength(200).IsRequired();
            builder.Property(n => n.Body).HasMaxLength(1000).IsRequired();

            // The notification list, newest first.
            builder.HasIndex(n => new { n.UserId, n.CreatedAt });

            // The unread count on the bell.
            builder.HasIndex(n => new { n.UserId, n.ReadAt });
        }
    }
}
