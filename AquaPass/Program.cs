using AquaPass.Data;
using AquaPass.Hubs;
using AquaPass.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi;
using Microsoft.OpenApi.Models;
using QuestPDF.Infrastructure;
using StackExchange.Redis;
using System.Text;
using System.Text.Json.Serialization;
using Serilog;

namespace AquaPass
{
    public class Program
    {
        public static async Task Main(string[] args)
        {
            Log.Logger = new LoggerConfiguration()
               .WriteTo.Console()
               .WriteTo.File(
            path: "Logs/aquapass-.log",
            rollingInterval: RollingInterval.Day,
            shared: true)
        .CreateBootstrapLogger();
            try
            {
                Log.Information("Starting AquaPass API host...");

                QuestPDF.Settings.License = LicenseType.Community;
                var builder = WebApplication.CreateBuilder(args);

                builder.Host.UseSerilog((context, services, configuration) => configuration
                    .ReadFrom.Configuration(context.Configuration)
                    .ReadFrom.Services(services)
                    .Enrich.FromLogContext());

                builder.Services.AddDbContext<AppDbContext>(options =>
                    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

                builder.Services.AddSingleton<IConnectionMultiplexer>(sp =>
                {
                    var configuration = builder.Configuration.GetConnectionString("Redis") ?? "localhost:6379";

                    return ConnectionMultiplexer.Connect(configuration);
                });

                builder.Services.AddControllers()
        .AddJsonOptions(options =>
            options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter()));
                builder.Services.AddScoped<SunbedService>();
                builder.Services.AddScoped<TariffService>();
                builder.Services.AddHttpClient<IMonobankPaymentService, MonobankPaymentService>();
                builder.Services.AddScoped<IStaffService, StaffService>();
                builder.Services.AddScoped<IAuthService, AuthService>();
                builder.Services.AddScoped<ITicketService, TicketService>();
                builder.Services.AddScoped<IOrderService, OrderService>();
                builder.Services.AddScoped<IQrCodeService, QrCodeService>();
                builder.Services.AddScoped<ITicketPdfGenerator, TicketPdfGenerator>();
                builder.Services.AddScoped<IEmailService, EmailService>();
                
                builder.Services.AddSingleton<ISunbedHoldService, SunbedHoldService>();
                builder.Services.AddSignalR();

                var jwtKey = builder.Configuration["Jwt:Key"] ?? "MineSuperSecretKeyThatIsAtLeast32BytesLong!";

                builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
                    .AddJwtBearer(options =>
                    {
                        options.TokenValidationParameters = new TokenValidationParameters
                        {
                            ValidateIssuer = true,
                            ValidateAudience = true,
                            ValidateLifetime = true,
                            ValidateIssuerSigningKey = true,
                            ValidIssuer = builder.Configuration["Jwt:Issuer"],
                            ValidAudience = builder.Configuration["Jwt:Audience"],
                            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey))
                        };
                    });

                builder.Services.AddEndpointsApiExplorer();
                builder.Services.AddSwaggerGen(options =>
                {
                    options.SwaggerDoc("v1", new OpenApiInfo
                    {
                        Title = "AquaPass API",
                        Version = "v1",
                        Description = "API для системи керування AquaPass"
                    });

                    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
                    {
                        Name = "Authorization",
                        Description = "Введіть токен у форматі: Bearer {ваш_токен}",
                        In = ParameterLocation.Header,
                        Type = SecuritySchemeType.Http,
                        Scheme = "bearer",
                        BearerFormat = "JWT"
                    });

                    options.AddSecurityRequirement(new OpenApiSecurityRequirement
                    {
                    {
                        new OpenApiSecurityScheme
                        {
                            Reference = new OpenApiReference
                            {
                                Type = ReferenceType.SecurityScheme,
                                Id = "Bearer"
                            }
                        },
                        Array.Empty<string>()
                    }
                    });
                });

                builder.Services.AddCors(options =>
                {
                    options.AddPolicy("AllowFrontend", policy =>
                    {
                        policy.WithOrigins("http://localhost:3000") 
                              .AllowAnyHeader()
                              .AllowAnyMethod()
                              .AllowCredentials(); 
                    });
                });

                var app = builder.Build();

                app.UseSerilogRequestLogging();

                using (var scope = app.Services.CreateScope())
                {
                    var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();

                    if (context.Database.IsRelational())
                    {
                        await context.Database.MigrateAsync();
                    }

                    var config = scope.ServiceProvider.GetRequiredService<IConfiguration>();

                    await DbInitializer.SeedAdminAsync(context, config);
                }

                app.UseCors("AllowFrontend");

                if (app.Environment.IsDevelopment())
                {
                    app.UseSwagger();
                    app.UseSwaggerUI(c =>
                    {
                        c.SwaggerEndpoint("/swagger/v1/swagger.json", "AquaPass API V1");
                        c.RoutePrefix = string.Empty;
                    });
                }
                app.UseAuthentication();
                app.UseAuthorization();

                app.MapControllers();
                app.MapHub<SunbedHub>("/hubs/sunbed");

                app.Run();
            }
            catch (Exception ex)
            {
                Log.Fatal(ex, "Application start-up failed");
            }
            finally
            {
                Log.CloseAndFlush();
            }
        }
    }
}