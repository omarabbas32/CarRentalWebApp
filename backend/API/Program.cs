using Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Application.Behaviors;
using Application.Common.Interfaces;
using MediatR;
using FluentValidation;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddMediatR(cfg => cfg.RegisterServicesFromAssembly(Application.AssemblyReference.Assembly));

builder.Services.AddValidatorsFromAssembly(Application.AssemblyReference.Assembly);

builder.Services.AddTransient(typeof(IPipelineBehavior<,>), typeof(ValidationBehavior<,>));


builder.Services.AddDbContext<AppDbContext>(options => options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));
builder.Services.AddScoped<IAppDbContext>(provider => provider.GetRequiredService<AppDbContext>());


var app = builder.Build();

app.MapGet("/", () => "Hello World!");

app.Run();
