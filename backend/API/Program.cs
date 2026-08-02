using Infrastructure.Identity;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using Microsoft.AspNetCore.RateLimiting;
using System.Threading.RateLimiting;
using Microsoft.OpenApi.Models;
using Application.Common.Interfaces;
using Application.Behaviors;
using Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using MediatR;
using FluentValidation;

var builder = WebApplication.CreateBuilder(args);

// Configuration
builder.Services.Configure<Infrastructure.Files.CloudinarySettings>(builder.Configuration.GetSection("Cloudinary"));
builder.Services.Configure<JwtSettings>(builder.Configuration.GetSection("JwtSettings"));

// Services
builder.Services.AddScoped<Application.Common.Interfaces.ICloudinaryService, Infrastructure.Files.CloudinaryService>();
builder.Services.AddScoped<IPasswordHasher, PasswordHasher>();
builder.Services.AddScoped<IIdentityService, IdentityService>();
builder.Services.AddScoped<Application.Common.Interfaces.ICurrentUserService, API.Services.CurrentUserService>();
// Not covered by the MediatR assembly scan below — that finds handlers and validators,
// not service interfaces.
builder.Services.AddScoped<INotificationService, API.Notifications.SignalRNotificationService>();
builder.Services.AddHttpContextAccessor();

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();

// CORS
const string CorsPolicyName = "DefaultCors";
var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? [];

builder.Services.AddCors(options =>
{
    options.AddPolicy(CorsPolicyName, policy =>
    {
        policy.WithOrigins(allowedOrigins)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

// Swagger Configuration
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "CarRental API", Version = "v1" });
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "JWT Authorization header using the Bearer scheme. Example: \"Authorization: Bearer {token}\"",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.ApiKey,
        Scheme = "Bearer"
    });

    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                },
                Scheme = "oauth2",
                Name = "Bearer",
                In = ParameterLocation.Header
            },
            new List<string>()
        }
    });
});

// Authentication
var jwtSettings = builder.Configuration.GetSection("JwtSettings").Get<JwtSettings>();
builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.RequireHttpsMetadata = false;
    options.SaveToken = true;
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.ASCII.GetBytes(jwtSettings!.Secret)),
        ValidateIssuer = true,
        ValidIssuer = jwtSettings.Issuer,
        ValidateAudience = true,
        ValidAudience = jwtSettings.Audience,
        ValidateLifetime = true,
        ClockSkew = TimeSpan.Zero
    };

    // A browser cannot set an Authorization header on a WebSocket upgrade, so the SignalR
    // client appends the token as ?access_token=. That is the standard workaround and the
    // only way the hub can authenticate.
    //
    // It is scoped to /hubs on purpose. Accepting a query-string token on the REST routes
    // as well would put JWTs into server access logs, browser history and Referer headers
    // — the exact places a bearer token should never appear.
    options.Events = new JwtBearerEvents
    {
        OnMessageReceived = context =>
        {
            var accessToken = context.Request.Query["access_token"];
            var path = context.HttpContext.Request.Path;

            if (!string.IsNullOrEmpty(accessToken) && path.StartsWithSegments("/hubs"))
            {
                context.Token = accessToken;
            }

            return Task.CompletedTask;
        }
    };
});

builder.Services.AddSignalR();

// Rate Limiting
builder.Services.AddRateLimiter(options =>
{
    options.AddFixedWindowLimiter("auth", opt =>
    {
        opt.Window = TimeSpan.FromMinutes(1);
        opt.PermitLimit = 5;
        opt.QueueLimit = 0;
        opt.QueueProcessingOrder = QueueProcessingOrder.OldestFirst;
    });
});

builder.Services.AddMediatR(cfg => cfg.RegisterServicesFromAssembly(Application.AssemblyReference.Assembly));
builder.Services.AddValidatorsFromAssembly(Application.AssemblyReference.Assembly);
builder.Services.AddTransient(typeof(IPipelineBehavior<,>), typeof(Application.Behaviors.AuthorizationBehavior<,>));
builder.Services.AddTransient(typeof(IPipelineBehavior<,>), typeof(ValidationBehavior<,>));

// Policies
builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("Cars.Manage", policy => policy.RequireRole("Admin", "Owner", "Staff"));
    options.AddPolicy("Bookings.Manage", policy => policy.RequireRole("Admin", "Staff"));
    options.AddPolicy("Users.Manage", policy => policy.RequireRole("Admin"));
});

builder.Services.AddDbContext<AppDbContext>(options => options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));
builder.Services.AddScoped<IAppDbContext>(provider => provider.GetRequiredService<AppDbContext>());

var app = builder.Build();

// Provision the first administrator. Does nothing unless Seed:Admin:Email and
// Seed:Admin:Password are both configured, so this is safe to leave enabled in
// every environment. See Infrastructure/Data/DbSeeder.cs.
using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    var seedLogger = services.GetRequiredService<ILoggerFactory>().CreateLogger("Seed");

    try
    {
        await DbSeeder.SeedAdminAsync(
            services.GetRequiredService<AppDbContext>(),
            services.GetRequiredService<IPasswordHasher>(),
            builder.Configuration,
            seedLogger);
    }
    catch (Exception ex)
    {
        // A database that is unreachable or un-migrated must not stop the API
        // from starting — the failure is logged and the app carries on.
        seedLogger.LogError(ex, "Admin seeding failed.");
    }
}

if (allowedOrigins.Length == 0)
{
    app.Logger.LogWarning(
        "No origins configured under Cors:AllowedOrigins - all cross-origin browser requests will be rejected.");
}

app.UseMiddleware<API.Middleware.ExceptionHandlingMiddleware>();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

// Must run before the rate limiter so preflight (OPTIONS) requests are answered
// by the CORS middleware instead of consuming the "auth" limiter's 5/min budget.
app.UseCors(CorsPolicyName);

app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

// After UseAuthentication/UseAuthorization, so the hub's [Authorize] has an identity to
// check. The path is matched by the OnMessageReceived handler above, which is what lets
// the WebSocket handshake carry a token at all.
app.MapHub<API.Hubs.NotificationHub>("/hubs/notifications");

app.Run();
