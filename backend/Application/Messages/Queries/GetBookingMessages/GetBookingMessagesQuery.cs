using Application.Common.Security;
using Application.Messages.Common;
using MediatR;

namespace Application.Messages.Queries.GetBookingMessages;

/// <summary>
/// One booking's thread.
/// </summary>
/// <remarks>
/// Ordered <b>newest first</b>, so page 1 is the bottom of the conversation and paging
/// walks backwards through history. The client reverses each page for display. This is
/// the one place in the API where wire order and render order deliberately differ.
///
/// Read access uses <c>EnsureParticipant</c>, so Admin and Staff can see a thread for
/// support purposes. Posting into one is narrower — see <c>SendMessageCommand</c>.
/// </remarks>
[Authorize]
public record GetBookingMessagesQuery(
    Guid BookingId,
    int PageNumber = 1,
    int PageSize = 50) : IRequest<GetBookingMessagesResult>;

public record GetBookingMessagesResult(
    List<MessageDto> Messages,
    int TotalCount,
    int PageNumber,
    int PageSize,
    int TotalPages);
