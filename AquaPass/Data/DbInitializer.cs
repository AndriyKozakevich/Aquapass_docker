using AquaPass.Models;
using Microsoft.EntityFrameworkCore;

namespace AquaPass.Data;

public static class DbInitializer
{
    public static async Task SeedAdminAsync(AppDbContext context, IConfiguration config)
    {
        var adminExists = await context.Staffs.AnyAsync(u => u.Role == "Admin");

        if (adminExists)
        {
            return;
        }

        var adminEmail = config["DefaultAdmin:Email"] ?? "admin@aquapass.com";
        var adminPassword = config["DefaultAdmin:Password"] ?? "Password";
        var adminName = config["DefaultAdmin:FullName"] ?? "Головний Адміністратор";

        var adminUser = new Staff
        {
            Id = Guid.NewGuid(),
            FullName = adminName,
            Email = adminEmail.Trim().ToLower(),
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(adminPassword),
            Role = "Admin",
            CreatedAt = DateTime.UtcNow
        };

        context.Staffs.Add(adminUser);
        await context.SaveChangesAsync();
    }

    public static async Task SeedSunbedsAsync(AppDbContext context)
    {
        var sunbedsExist = await context.Sunbeds.AnyAsync();

        if (sunbedsExist)
        {
            return;
        }

        var defaultZoneId = Guid.Parse("22222222-2222-2222-2222-222222222222");
        var sunbeds = new List<Sunbed>();

        for (int i = 1; i <= 10; i++)
        {
            sunbeds.Add(new Sunbed
            {
                Id = Guid.NewGuid(),
                Row = "A",
                Number = i,
                ZoneId = defaultZoneId,
                Description = "Тестовий шезлонг"
            });
        }

        await context.Sunbeds.AddRangeAsync(sunbeds);
        await context.SaveChangesAsync();
    }
}