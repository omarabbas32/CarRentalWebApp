using Domain.User;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Infrastructure.Data.Configurations
{
    public class UserVerificationConfiguration : IEntityTypeConfiguration<UserVerification>
    {
        public void Configure(EntityTypeBuilder<UserVerification> builder)
        {
            builder.HasKey(uv => uv.Id);

            builder.HasOne(uv => uv.User)
                .WithOne(u => u.Verification)
                .HasForeignKey<UserVerification>(uv => uv.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        }
    }
}
