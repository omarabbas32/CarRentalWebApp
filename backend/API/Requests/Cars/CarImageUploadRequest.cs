using Domain.Car;
using Microsoft.AspNetCore.Http;

namespace API.Requests.Cars;

public class CarImageUploadRequest
{
    public IFormFile File { get; set; } = null!;
    public CarImageType Type { get; set; }
    public bool IsPrimary { get; set; }
}
