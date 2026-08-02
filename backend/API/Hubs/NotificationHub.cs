using Microsoft.AspNetCore.SignalR;

namespace API.Hubs;

/// <summary>
/// The server's outbound channel to a signed-in user.
/// </summary>
/// <remarks>
/// Deliberately empty. The hub has no client-callable methods: everything the browser
/// sends still goes through the REST controllers, which already carry the MediatR
/// authorization behaviour and validation pipeline. A hub method would be a second
/// entry point into the domain with none of that, and two authorization models is one
/// too many.
///
/// <para>
/// Messages are addressed with <c>Clients.User(id)</c>. SignalR's default
/// <c>IUserIdProvider</c> reads <c>ClaimTypes.NameIdentifier</c>, which
/// <c>IdentityService.GenerateJwtToken</c> already writes — so there is no connection
/// bookkeeping to maintain, and a user signed in on a phone and a laptop gets both.
/// </para>
///
/// <para>
/// The attribute is fully qualified: <c>Application.Common.Security.AuthorizeAttribute</c>
/// is this codebase's own MediatR attribute and is not interchangeable with ASP.NET's.
/// </para>
/// </remarks>
[Microsoft.AspNetCore.Authorization.Authorize]
public class NotificationHub : Hub
{
}
