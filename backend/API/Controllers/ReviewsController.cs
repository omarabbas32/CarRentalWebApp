using API.Requests.Reviews;
using Application.Reviews.Commands.CreateReview;
using Application.Reviews.Commands.DeleteReview;
using Application.Reviews.Queries.GetBookingReviews;
using Application.Reviews.Queries.GetCarReviews;
using Application.Reviews.Queries.GetUserReviews;
using Microsoft.AspNetCore.Mvc;

namespace API.Controllers;

/// <summary>
/// Two-sided reviews on finished trips: the renter rates the owner and the car, the owner
/// rates the renter. One per trip per direction.
///
/// The car and user listings are public — they are reputation, and reputation behind a
/// login is not much use to someone deciding whether to book.
/// </summary>
public class ReviewsController : BaseApiController
{
    [HttpPost]
    public async Task<IActionResult> CreateReview([FromBody] CreateReviewRequest request)
    {
        var command = new CreateReviewCommand(
            request.BookingId,
            request.Rating,
            request.Comment);

        var reviewId = await Mediator.Send(command);
        return Ok(reviewId);
    }

    [HttpGet("car/{carId:guid}")]
    public async Task<IActionResult> GetCarReviews(
        Guid carId,
        [FromQuery] PagedReviewsRequest request)
    {
        var query = new GetCarReviewsQuery(carId, request.PageNumber, request.PageSize);
        return Ok(await Mediator.Send(query));
    }

    [HttpGet("user/{userId:guid}")]
    public async Task<IActionResult> GetUserReviews(
        Guid userId,
        [FromQuery] PagedReviewsRequest request)
    {
        var query = new GetUserReviewsQuery(userId, request.PageNumber, request.PageSize);
        return Ok(await Mediator.Send(query));
    }

    [HttpGet("booking/{bookingId:guid}")]
    public async Task<IActionResult> GetBookingReviews(Guid bookingId)
    {
        return Ok(await Mediator.Send(new GetBookingReviewsQuery(bookingId)));
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> DeleteReview(Guid id)
    {
        await Mediator.Send(new DeleteReviewCommand(id));
        return NoContent();
    }
}
