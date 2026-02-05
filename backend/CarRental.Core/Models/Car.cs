using System;
using System.Collections.Generic;
using CarRental.Core.Enums;
using NetTopologySuite.Geometries;

namespace CarRental.Core.Models
{
    public class Car
    {
        public Guid Id { get; set; }
        public Guid OwnerId { get; set; }
        public virtual User Owner { get; set; } = null!;

        // Basic Info
        public string Make { get; set; } = string.Empty;
        public string Model { get; set; } = string.Empty;
        public int Year { get; set; }
        public string Color { get; set; } = string.Empty;
        public string LicensePlate { get; set; } = string.Empty;
        public string VIN { get; set; } = string.Empty;

        // Specs
        public TransmissionType Transmission { get; set; }
        public FuelType FuelType { get; set; }
        public int Seats { get; set; }
        public int Doors { get; set; }
        public int Mileage { get; set; }
        public CarCategory Category { get; set; }

        // Features
        public bool HasGPS { get; set; }
        public bool HasBluetooth { get; set; }
        public bool HasUSBCharging { get; set; }
        public bool HasChildSeat { get; set; }
        public bool HasAirConditioning { get; set; }
        public bool HasBackupCamera { get; set; }

        // Location
        public Point Location { get; set; } = null!;
        public string LocationAddress { get; set; } = string.Empty;
        public string LocationCity { get; set; } = string.Empty;
        public string LocationState { get; set; } = string.Empty;

        // Pricing
        public decimal PricePerDay { get; set; }
        public decimal PricePerWeek { get; set; }
        public decimal PricePerMonth { get; set; }
        public decimal SecurityDeposit { get; set; }

        // Mileage Rules
        public int DailyMileageLimit { get; set; }
        public decimal ExtraMileageCharge { get; set; }

        // Status
        public bool IsAvailable { get; set; }
        public bool IsActive { get; set; }

        // Ratings
        public double AverageRating { get; set; }
        public int TotalReviews { get; set; }
        public int TotalTrips { get; set; }

        public DateTime CreatedAt { get; set; }

        // Relationships
        public virtual ICollection<CarImage> Images { get; set; } = new List<CarImage>();
        public virtual ICollection<Booking> Bookings { get; set; } = new List<Booking>();
        public virtual ICollection<CarAvailability> Availabilities { get; set; } = new List<CarAvailability>();
    }

    public class CarImage
    {
        public Guid Id { get; set; }
        public Guid CarId { get; set; }
        public virtual Car Car { get; set; } = null!;

        public string ImageUrl { get; set; } = string.Empty;
        public int DisplayOrder { get; set; }
        public bool IsPrimary { get; set; }
        public CarImageType ImageType { get; set; }
    }

    public class CarAvailability
    {
        public Guid Id { get; set; }
        public Guid CarId { get; set; }
        public virtual Car Car { get; set; } = null!;

        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public bool IsAvailable { get; set; }
        public string? Reason { get; set; }
    }
}
