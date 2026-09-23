using System;
using System.IdentityModel.Tokens.Jwt;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using AquaPass;
using AquaPass.Models;
using AquaPass.ModelsDto;
using AquaPass.Services;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Moq;
using Xunit;

namespace AquaPass.Tests
{
    public class AuthServiceTests : IDisposable
    {
        private readonly AppDbContext _ctx;
        private readonly Mock<IConfiguration> _configMock;
        private readonly AuthService _sut;

        private const string TestKey = "SUPER_SECRET_AQUAPASS_KEY_123456789_LONG_ENOUGH_CUSTOM";
        private const string TestIssuer = "CustomAquaPassIssuer";
        private const string TestAudience = "CustomAquaPassAudience";

        public AuthServiceTests()
        {
            var options = new DbContextOptionsBuilder<AppDbContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .Options;

            _ctx = new AppDbContext(options);

            _configMock = new Mock<IConfiguration>();
            _configMock.Setup(c => c["Jwt:Key"]).Returns(TestKey);
            _configMock.Setup(c => c["Jwt:Issuer"]).Returns(TestIssuer);
            _configMock.Setup(c => c["Jwt:Audience"]).Returns(TestAudience);

            _sut = new AuthService(_ctx, _configMock.Object);
        }

        public void Dispose()
        {
            _ctx.Database.EnsureDeleted();
            _ctx.Dispose();
        }

        [Fact]
        public async Task LoginAsync_WhenCredentialsAreValid_ShouldReturnTokenWithCorrectClaims()
        {
            // Arrange
            const string rawPassword = "CorrectPassword123!";
            var staff = new Staff
            {
                Id = Guid.NewGuid(),
                FullName = "Андрій Шевченко",
                Email = "andriy@aquapass.ua",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(rawPassword),
                Role = "Cashier",
                CreatedAt = DateTime.UtcNow
            };

            _ctx.Staffs.Add(staff);
            await _ctx.SaveChangesAsync();

            // Перевіряємо обробку регістру та пробілів у запиті
            var loginDto = new StaffLoginDto("  ANDRIY@AQUAPASS.UA  ", rawPassword);

            // Act
            var result = await _sut.LoginAsync(loginDto);

            // Assert
            result.Should().NotBeNull();
            result!.FullName.Should().Be("Андрій Шевченко");
            result.Email.Should().Be("andriy@aquapass.ua");
            result.Role.Should().Be("Cashier");
            result.Token.Should().NotBeNullOrWhiteSpace();
            result.ExpiresAt.Should().BeAfter(DateTime.UtcNow.AddDays(6));

            // Декодування та верифікація вмісту JWT токена
            var handler = new JwtSecurityTokenHandler();
            var jwt = handler.ReadJwtToken(result.Token);

            jwt.Issuer.Should().Be(TestIssuer);
            jwt.Audiences.Should().Contain(TestAudience);
            jwt.Claims.First(c => c.Type == ClaimTypes.NameIdentifier).Value.Should().Be(staff.Id.ToString());
            jwt.Claims.First(c => c.Type == ClaimTypes.Name).Value.Should().Be(staff.FullName);
            jwt.Claims.First(c => c.Type == ClaimTypes.Email).Value.Should().Be(staff.Email);
            jwt.Claims.First(c => c.Type == ClaimTypes.Role).Value.Should().Be("Cashier");
        }

        [Fact]
        public async Task LoginAsync_WhenUserNotFound_ShouldReturnNull()
        {
            // Arrange
            var loginDto = new StaffLoginDto("nonexistent@aquapass.ua", "AnyPassword");

            // Act
            var result = await _sut.LoginAsync(loginDto);

            // Assert
            result.Should().BeNull();
        }

        [Fact]
        public async Task LoginAsync_WhenPasswordIsIncorrect_ShouldReturnNull()
        {
            // Arrange
            var staff = new Staff
            {
                Id = Guid.NewGuid(),
                FullName = "Марія Петрівна",
                Email = "maria@aquapass.ua",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("RightPassword123"),
                Role = "Admin",
                CreatedAt = DateTime.UtcNow
            };

            _ctx.Staffs.Add(staff);
            await _ctx.SaveChangesAsync();

            var loginDto = new StaffLoginDto("maria@aquapass.ua", "WrongPassword");

            // Act
            var result = await _sut.LoginAsync(loginDto);

            // Assert
            result.Should().BeNull();
        }

        [Fact]
        public async Task LoginAsync_WhenConfigKeysAreMissing_ShouldFallbackToDefaultsAndSucceed()
        {
            // Arrange
            var emptyConfigMock = new Mock<IConfiguration>();
            var sutWithDefaultConfig = new AuthService(_ctx, emptyConfigMock.Object);

            const string rawPassword = "SecretPassword";
            var staff = new Staff
            {
                Id = Guid.NewGuid(),
                FullName = "Дефолтний Адмін",
                Email = "default@aquapass.ua",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(rawPassword),
                Role = "Admin",
                CreatedAt = DateTime.UtcNow
            };

            _ctx.Staffs.Add(staff);
            await _ctx.SaveChangesAsync();

            var loginDto = new StaffLoginDto("default@aquapass.ua", rawPassword);

            // Act
            var result = await sutWithDefaultConfig.LoginAsync(loginDto);

            // Assert
            result.Should().NotBeNull();
            result!.Token.Should().NotBeNullOrWhiteSpace();

            var handler = new JwtSecurityTokenHandler();
            var jwt = handler.ReadJwtToken(result.Token);

            // Перевірка значень за замовчуванням
            jwt.Issuer.Should().Be("AquaPassServer");
            jwt.Audiences.Should().Contain("AquaPassClient");
        }
    }
}