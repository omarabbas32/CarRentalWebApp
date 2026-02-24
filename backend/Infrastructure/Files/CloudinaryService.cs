using Application.Common.Interfaces;
using CloudinaryDotNet;
using CloudinaryDotNet.Actions;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Options;

namespace Infrastructure.Files;

public class CloudinaryService : ICloudinaryService
{
    private readonly Cloudinary _cloudinary;

    public CloudinaryService(IOptions<CloudinarySettings> config)
    {
        var acc = new Account(
            config.Value.CloudName,
            config.Value.ApiKey,
            config.Value.ApiSecret
        );

        _cloudinary = new Cloudinary(acc);
    }

    public async Task<string> UploadImageAsync(IFormFile file, string folderName)
    {
        if (file.Length <= 0) return string.Empty;

        using var stream = file.OpenReadStream();
        var uploadParams = new ImageUploadParams
        {
            File = new FileDescription(file.FileName, stream),
            Folder = folderName,
            Transformation = new Transformation().Height(1000).Width(1000).Crop("limit")
        };

        var uploadResult = await _cloudinary.UploadAsync(uploadParams);

        if (uploadResult.Error != null)
        {
            throw new Exception(uploadResult.Error.Message);
        }

        return uploadResult.SecureUrl.ToString();
    }

    public async Task<bool> DeleteImageAsync(string publicId)
    {
        var deleteParams = new DeletionParams(publicId);
        var result = await _cloudinary.DestroyAsync(deleteParams);

        return result.Result == "ok";
    }
}
