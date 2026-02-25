using Application.Users.Commands.CreateUser;
using Application.Users.Commands.UpdateUser;
using Application.Users.Commands.DeleteUser;
using Application.Users.Commands.UploadVerificationDocument;
using Application.Users.Commands.ProcessVerification;
using Application.Users.Queries.GetUserById;
using Application.Users.Queries.GetPendingVerifications;
using Domain.User;
using API.Requests.Users;
using Microsoft.AspNetCore.Mvc;

namespace API.Controllers;

public class UsersController : BaseApiController
{
    [HttpPost]
    public async Task<IActionResult> CreateUser([FromBody] CreateUserRequest request)
    {
        var command = new CreateUserCommand(
            request.Email,
            request.Password,
            request.PhoneNumber,
            request.FirstName,
            request.LastName,
            request.Role);
            
        var userId = await Mediator.Send(command);
        return Ok(userId);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetUserById(Guid id)
    {
        return Ok(await Mediator.Send(new GetUserByIdQuery(id)));
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> UpdateUser(Guid id, [FromBody] UpdateUserRequest request)
    {
        var command = new UpdateUserCommand(
            id,
            request.Email,
            request.PhoneNumber,
            request.FirstName,
            request.LastName);
            
        await Mediator.Send(command);
        return NoContent();
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> DeleteUser(Guid id)
    {
        await Mediator.Send(new DeleteUserCommand(id));
        return NoContent();
    }

    [HttpPost("{id:guid}/verification")]
    public async Task<IActionResult> UploadVerificationDocument(Guid id, [FromForm] UserVerificationUploadRequest request)
    {
        var command = new UploadVerificationDocumentCommand(id, request.File, request.Type, request.IdType);
        var imageUrl = await Mediator.Send(command);
        return Ok(new { url = imageUrl });
    }

    [HttpGet("pending-verifications")]
    public async Task<IActionResult> GetPendingVerifications()
    {
        return Ok(await Mediator.Send(new GetPendingVerificationsQuery()));
    }

    [HttpPost("{id:guid}/process-verification")]
    public async Task<IActionResult> ProcessVerification(Guid id, [FromBody] ProcessVerificationRequest request)
    {
        var command = new ProcessVerificationCommand(id, request.DocumentType, request.Status, request.Reason);
        await Mediator.Send(command);
        return NoContent();
    }
}
