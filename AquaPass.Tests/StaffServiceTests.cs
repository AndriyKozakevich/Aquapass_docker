using System;
using System.Collections.Generic;
using System.IdentityModel.Tokens.Jwt;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using AquaPass.Data;
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
    public class StaffServiceTests : IDisposable
    {
        private readonly AppDbContext _ctx;
        private readonly Mock<IConfiguration> _configMock;
        private readonly StaffService _sut;

        private const string TestJwtKey = "AQUAPASS_SUPER_SECRET_JWT_KEY_MIN_32_CHARS_LONG_2026";
        private const string TestIssuer = "AquaPassServerTest";
        private const string TestAudience = "AquaPassClientTest";

        public StaffServiceTests()
        {
            var options = new DbContextOptionsBuilder<AppDbContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .Options;

            _ctx = new AppDbContext(options);

            _configMock = new Mock<IConfiguration>();
            _configMock.Setup(c => c["Jwt:Key"]).Returns(TestJwtKey);
            _configMock.Setup(c => c["Jwt:Issuer"]).Returns(TestIssuer);
            _configMock.Setup(c => c["Jwt:Audience"]).Returns(TestAudience);

            _sut = new StaffService(_ctx, _configMock.Object);
        }

        public void Dispose()
        {
            _ctx.Database.EnsureDeleted();
            _ctx.Dispose();
        }

        #region LoginAsync Tests

        [Fact]
        public async Task LoginAsync_WhenCredentialsValid_ShouldReturnAuthResponseWithValidJwt()
        {
            // Arrange
            const string rawPassword = "SecurePassword123!";
            var staff = new Staff
            {
                Id = Guid.NewGuid(),
                FullName = "Іван Франко",
                Email = "ivan@aquapass.ua",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(rawPassword),
                Role = "Admin",
                CreatedAt = DateTime.UtcNow
            };
            _ctx.Staffs.Add(staff);
            await _ctx.SaveChangesAsync();

            var loginDto = new StaffLoginDto("  IVAN@AQUAPASS.UA  ", rawPassword);

            // Act
            var result = await _sut.LoginAsync(loginDto);

            // Assert
            result.Should().NotBeNull();
            result!.Email.Should().Be("ivan@aquapass.ua");
            result.FullName.Should().Be("Іван Франко");
            result.Role.Should().Be("Admin");
            result.Token.Should().NotBeNullOrWhiteSpace();

            // Проверка валидности структуры и клеймов JWT
            var handler = new JwtSecurityTokenHandler();
            var jwt = handler.ReadJwtToken(result.Token);

            jwt.Issuer.Should().Be(TestIssuer);
            jwt.Audiences.Should().Contain(TestAudience);
            jwt.Claims.First(c => c.Type == ClaimTypes.NameIdentifier).Value.Should().Be(staff.Id.ToString());
            jwt.Claims.First(c => c.Type == ClaimTypes.Role).Value.Should().Be("Admin");
            jwt.Claims.First(c => c.Type == ClaimTypes.Email).Value.Should().Be("ivan@aquapass.ua");
        }

        [Fact]
        public async Task LoginAsync_WhenEmailDoesNotExist_ShouldReturnNull()
        {
            // Arrange
            var loginDto = new StaffLoginDto("unknown@aquapass.ua", "AnyPassword");

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
                FullName = "Касир 1",
                Email = "cashier@aquapass.ua",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("CorrectPassword"),
                Role = "Cashier",
                CreatedAt = DateTime.UtcNow
            };
            _ctx.Staffs.Add(staff);
            await _ctx.SaveChangesAsync();

            var loginDto = new StaffLoginDto("cashier@aquapass.ua", "WrongPassword");

            // Act
            var result = await _sut.LoginAsync(loginDto);

            // Assert
            result.Should().BeNull();
        }

        #endregion

        #region GetAllStaffAsync Tests

        [Fact]
        public async Task GetAllStaffAsync_ShouldReturnStaffOrderedByCreatedAtDescending()
        {
            // Arrange
            var older = new Staff
            {
                Id = Guid.NewGuid(),
                FullName = "Старший Касир",
                Email = "old@aquapass.ua",
                PasswordHash = "hash1",
                Role = "Cashier",
                CreatedAt = DateTime.UtcNow.AddDays(-5)
            };
            var newer = new Staff
            {
                Id = Guid.NewGuid(),
                FullName = "Новий Адмін",
                Email = "new@aquapass.ua",
                PasswordHash = "hash2",
                Role = "Admin",
                CreatedAt = DateTime.UtcNow
            };

            _ctx.Staffs.AddRange(older, newer);
            await _ctx.SaveChangesAsync();

            // Act
            var result = await _sut.GetAllStaffAsync();

            // Assert
            result.Should().HaveCount(2);
            result.First().Email.Should().Be("new@aquapass.ua");
            result.Last().Email.Should().Be("old@aquapass.ua");
        }

        #endregion

        #region CreateStaffMemberAsync Tests

        [Fact]
        public async Task CreateStaffMemberAsync_WhenEmailAlreadyExists_ShouldReturnFailure()
        {
            // Arrange
            var existingStaff = new Staff
            {
                Id = Guid.NewGuid(),
                FullName = "Діючий Співробітник",
                Email = "duplicate@aquapass.ua",
                PasswordHash = "hash",
                Role = "Cashier",
                CreatedAt = DateTime.UtcNow
            };
            _ctx.Staffs.Add(existingStaff);
            await _ctx.SaveChangesAsync();

            var createDto = new CreateStaffMemberDto(
                "Інший Співробітник",
                "  DUPLICATE@AQUAPASS.UA  ",
                "Password123!",
                "Admin"
            );

            // Act
            var (success, message, data) = await _sut.CreateStaffMemberAsync(createDto);

            // Assert
            success.Should().BeFalse();
            message.Should().Contain("вже існує в системі");
            data.Should().BeNull();
        }

        [Fact]
        public async Task CreateStaffMemberAsync_WhenRoleIsInvalid_ShouldFallbackToCashier()
        {
            // Arrange
            var createDto = new CreateStaffMemberDto(
                "Тестовий Користувач",
                "user@aquapass.ua",
                "Password123!",
                "SuperOwner" // Невідома роль
            );

            // Act
            var (success, message, data) = await _sut.CreateStaffMemberAsync(createDto);

            // Assert
            success.Should().BeTrue();
            data.Should().NotBeNull();
            data!.Role.Should().Be("Cashier");

            var inDb = await _ctx.Staffs.FindAsync(data.Id);
            inDb!.Role.Should().Be("Cashier");
        }

        [Fact]
        public async Task CreateStaffMemberAsync_WhenDataValid_ShouldSaveWithHashedPassword()
        {
            // Arrange
            const string password = "PlainTextPassword123!";
            var createDto = new CreateStaffMemberDto(
                "Ольга Коваленко",
                "olga@aquapass.ua",
                password,
                "Admin"
            );

            // Act
            var (success, message, data) = await _sut.CreateStaffMemberAsync(createDto);

            // Assert
            success.Should().BeTrue();
            data.Should().NotBeNull();
            data!.FullName.Should().Be("Ольга Коваленко");
            data.Email.Should().Be("olga@aquapass.ua");
            data.Role.Should().Be("Admin");

            var inDb = await _ctx.Staffs.FindAsync(data.Id);
            inDb.Should().NotBeNull();
            // Пароль не должен храниться в открытом виде
            inDb!.PasswordHash.Should().NotBe(password);
            BCrypt.Net.BCrypt.Verify(password, inDb.PasswordHash).Should().BeTrue();
        }

        #endregion

        #region DeleteStaffMemberAsync Tests

        [Fact]
        public async Task DeleteStaffMemberAsync_WhenDeletingSelf_ShouldReturnFalseAndNotDelete()
        {
            // Arrange
            var adminId = Guid.NewGuid();
            var admin = new Staff
            {
                Id = adminId,
                FullName = "Головний Адмін",
                Email = "mainadmin@aquapass.ua",
                PasswordHash = "hash",
                Role = "Admin",
                CreatedAt = DateTime.UtcNow
            };
            _ctx.Staffs.Add(admin);
            await _ctx.SaveChangesAsync();

            // Act
            var result = await _sut.DeleteStaffMemberAsync(adminId, currentAdminId: adminId);

            // Assert
            result.Should().BeFalse();
            var inDb = await _ctx.Staffs.FindAsync(adminId);
            inDb.Should().NotBeNull();
        }

        [Fact]
        public async Task DeleteStaffMemberAsync_WhenStaffDoesNotExist_ShouldReturnFalse()
        {
            // Arrange
            var currentAdminId = Guid.NewGuid();

            // Act
            var result = await _sut.DeleteStaffMemberAsync(Guid.NewGuid(), currentAdminId);

            // Assert
            result.Should().BeFalse();
        }

        [Fact]
        public async Task DeleteStaffMemberAsync_WhenValid_ShouldRemoveFromDatabase()
        {
            // Arrange
            var currentAdminId = Guid.NewGuid();
            var targetStaffId = Guid.NewGuid();

            var target = new Staff
            {
                Id = targetStaffId,
                FullName = "Касир на видалення",
                Email = "delete_me@aquapass.ua",
                PasswordHash = "hash",
                Role = "Cashier",
                CreatedAt = DateTime.UtcNow
            };
            _ctx.Staffs.Add(target);
            await _ctx.SaveChangesAsync();

            // Act
            var result = await _sut.DeleteStaffMemberAsync(targetStaffId, currentAdminId);

            // Assert
            result.Should().BeTrue();
            var inDb = await _ctx.Staffs.FindAsync(targetStaffId);
            inDb.Should().BeNull();
        }

        #endregion
    }
}