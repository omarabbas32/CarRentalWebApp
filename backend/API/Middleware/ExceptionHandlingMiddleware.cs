using System.Net;
using System.Text.Json;
using Application.Common.Exceptions;

namespace API.Middleware;

public class ExceptionHandlingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ExceptionHandlingMiddleware> _logger;

    public ExceptionHandlingMiddleware(RequestDelegate next, ILogger<ExceptionHandlingMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task Invoke(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            await HandleExceptionAsync(context, ex);
        }
    }

    private Task HandleExceptionAsync(HttpContext context, Exception exception)
    {
        var code = HttpStatusCode.InternalServerError;
        var result = string.Empty;

        switch (exception)
        {
            case ValidationException validationException:
                code = HttpStatusCode.BadRequest;
                result = JsonSerializer.Serialize(new { errors = validationException.Errors });
                break;
            case NotFoundException notFoundException:
                code = HttpStatusCode.NotFound;
                result = JsonSerializer.Serialize(new { error = notFoundException.Message });
                break;
            case ForbiddenAccessException:
                code = HttpStatusCode.Forbidden;
                break;
            default:
                _logger.LogError(exception, "An unhandled exception has occurred.");
                result = JsonSerializer.Serialize(new { error = "An internal server error occurred." });
                break;
        }

        context.Response.ContentType = "application/json";
        context.Response.StatusCode = (int)code;

        return context.Response.WriteAsync(result);
    }
}
