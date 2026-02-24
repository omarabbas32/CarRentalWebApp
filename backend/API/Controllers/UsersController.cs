using Application.Users.Commands.CreateUser;
using Application.Users.Commands.UpdateUser;
using Application.Users.Commands.DeleteUser;
using Application.Users.Commands.UploadVerificationDocument;
using Application.Users.Queries.GetUserById;
using Domain.User;
using API.Requests.Users;
using Microsoft.AspNetCore.Mvc;

namespace API.Controllers;

public class UsersController : BaseApiController
{
    [HttpPost]
    public async Task<IActionResult> CreateUser([FromBody] CreateUserCommand command)
    {
        var userId = await Mediator.Send(command);
        return Ok(userId);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetUserById(Guid id)
    {
        return Ok(await Mediator.Send(new GetUserByIdQuery(id)));
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> UpdateUser(Guid id, [FromBody] UpdateUserCommand command)
    {
        if (id != command.Id) return BadRequest("ID mismatch.");
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
}
