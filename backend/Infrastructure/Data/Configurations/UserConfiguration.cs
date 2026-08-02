using Domain.User;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Infrastructure.Data.Configurations
{
    public class UserConfiguration : IEntityTypeConfiguration<User>
    {
        public void Configure(EntityTypeBuilder<User> builder)
        {
            builder.HasKey(u => u.Id);

            // GivenReviews, ReceivedReviews, SentMessages and ReceivedMessages used to be
            // configured here with `.WithOne()` — no navigation on the far side, because
            // Review and Message were placeholders that had none.
            //
            // They do now, and ReviewConfiguration/MessageConfiguration declare both ends.
            // Leaving these in place made EF treat each pair as *two* relationships and
            // invent shadow foreign keys (SenderId1, RevieweeId1, …) beside the real ones.
            // A relationship belongs to the dependent's configuration, and is declared once.

            builder.HasOne(u => u.Verification)
                .WithOne(v => v.User)
                .HasForeignKey<UserVerification>(v => v.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        }
    }
}
