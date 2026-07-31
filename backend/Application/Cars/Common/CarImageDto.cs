using Domain.Car;

namespace Application.Cars.Common;

/// <summary>
/// A car's photo, <b>with its id</b>.
///
/// <see cref="CarSearchResultDto"/> carries <c>ImageUrls</c> — URLs and nothing
/// else — which is all a renter browsing results needs. But
/// <c>DELETE /api/cars/images/{imageId}</c> and the set-cover endpoint both
/// take an id, so an owner managing their own photos could not act on a single
/// one of them: the id existed only in the response to the upload that created
/// it, and was gone as soon as the page reloaded.
/// </summary>
public record CarImageDto(
    Guid Id,
    string Url,
    CarImageType Type,
    bool IsPrimary,
    int DisplayOrder
);
