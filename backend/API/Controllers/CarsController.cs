using Application.Cars.Commands.CreateCar;
using Application.Cars.Commands.DeleteCar;
using Application.Cars.Commands.UpdateCar;
using Application.Cars.Queries.GetCarById;
using Application.Cars.Queries.GetCars;
using Microsoft.AspNetCore.Mvc;

namespace API.Controllers;

public class CarsController : BaseApiController
{
    [HttpPost]
    public async Task<IActionResult> CreateCar([FromBody] CreateCarCommand command)
    {
        var carId = await Mediator.Send(command);
        return CreatedAtAction(nameof(GetCarById), new { id = carId }, carId);
    }

    [HttpGet]
    public async Task<IActionResult> GetCars()
    {
        return Ok(await Mediator.Send(new GetCarsQuery()));
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetCarById(Guid id)
    {
        return Ok(await Mediator.Send(new GetCarByIdQuery(id)));
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> UpdateCar(Guid id, [FromBody] UpdateCarCommand command)
    {
        if (id != command.Id)
        {
            return BadRequest("ID mismatch.");
        }

        await Mediator.Send(command);
        return NoContent();
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> DeleteCar(Guid id)
    {
        await Mediator.Send(new DeleteCarCommand(id));
        return NoContent();
    }
}
