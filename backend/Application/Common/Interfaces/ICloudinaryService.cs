using Microsoft.AspNetCore.Http;

namespace Application.Common.Interfaces;

public interface ICloudinaryService
{
    Task<string> UploadImageAsync(IFormFile file, string folderName);
    Task<bool> DeleteImageAsync(string publicId);
}
