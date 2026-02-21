using Microsoft.EntityFrameworkCore;
using Domain.Car;
using Domain.Booking;
using Domain.User;

namespace Application.Common.Interfaces;

public interface IAppDbContext
{
    DbSet<Car> Cars { get; }
    DbSet<CarImage> CarImages { get; }
    DbSet<CarAvailability> CarAvailabilities { get; }
    DbSet<Booking> Bookings { get; }
    DbSet<TripInspection> TripInspections { get; }
    DbSet<InspectionPhoto> InspectionPhotos { get; }
    DbSet<User> Users { get; }
    DbSet<UserVerification> UserVerifications { get; }

    Task<int> SaveChangesAsync(CancellationToken cancellationToken);
}
