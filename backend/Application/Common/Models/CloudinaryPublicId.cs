namespace Application.Common.Models;

/// <summary>
/// Recovers a Cloudinary public id from a delivery URL.
///
/// <see cref="ICloudinaryService.DeleteImageAsync"/> takes the public id, but
/// nothing stores it — only the full URL is persisted, on
/// <c>CarImage.ImageUrl</c>, <c>InspectionPhoto.PhotoUrl</c> and the three
/// verification document columns. So every delete has to work backwards from
/// the URL, and each place that does it the wrong way leaves a file behind in
/// Cloudinary for good.
///
/// A URL looks like:
/// <c>https://res.cloudinary.com/&lt;cloud&gt;/image/upload/v1712345678/cars/&lt;guid&gt;/abc123.jpg</c>
/// — everything after the version segment, minus the extension, is the id.
/// The folder is part of it, so <c>cars/&lt;guid&gt;/abc123</c> is the answer
/// and <c>abc123</c> alone is not.
///
/// Storing the public id alongside the URL would make all of this unnecessary,
/// and is the better fix whenever the schema is next touched.
/// </summary>
public static class CloudinaryPublicId
{
    public static string FromUrl(string? url)
    {
        if (string.IsNullOrWhiteSpace(url)) return string.Empty;

        var segments = url.Split('/');
        var uploadIndex = Array.IndexOf(segments, "upload");
        if (uploadIndex < 0) return string.Empty;

        // The segment after "upload" is the version (v1712345678) when
        // present, and a transformation when one was requested. Skip a leading
        // version; anything else is part of the path.
        var rest = segments.Skip(uploadIndex + 1).ToList();
        if (rest.Count > 0 && rest[0].Length > 1 && rest[0][0] == 'v' && rest[0].Skip(1).All(char.IsDigit))
        {
            rest.RemoveAt(0);
        }

        if (rest.Count == 0) return string.Empty;

        var path = string.Join("/", rest);
        var lastDot = path.LastIndexOf('.');
        // Only an extension on the final segment counts — a folder name may
        // legitimately contain a dot.
        var lastSlash = path.LastIndexOf('/');
        return lastDot > lastSlash && lastDot >= 0 ? path[..lastDot] : path;
    }
}
