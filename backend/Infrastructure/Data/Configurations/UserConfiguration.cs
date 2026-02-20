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

            builder.HasOne(u => u.Verification)
                .WithOne(v => v.User)
                .HasForeignKey<UserVerification>(v => v.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        }
    }
}
