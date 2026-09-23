using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using AquaPass;
using AquaPass.Enums;
using AquaPass.Models;
using AquaPass.ModelsDto;
using AquaPass.Services;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace AquaPass.Tests
{
    public class TariffServiceTests : IDisposable
    {
        private readonly AppDbContext _ctx;
        private readonly TariffService _sut;
        private static readonly Guid StandardZoneId = Guid.Parse("22222222-2222-2222-2222-222222222222");
        private static readonly Guid VipZoneId = Guid.Parse("11111111-1111-1111-1111-111111111111");

        public TariffServiceTests()
        {
            var options = new DbContextOptionsBuilder<AppDbContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .Options;

            _ctx = new AppDbContext(options);
            _ctx.Database.EnsureCreated(); // Застосовує Seed Data із OnModelCreating

            _sut = new TariffService(_ctx);
        }

        public void Dispose()
        {
            _ctx.Database.EnsureDeleted();
            _ctx.Dispose();
        }

        #region Read Operations Tests

        [Fact]
        public async Task GetAllAsync_ShouldReturnAllSeedTariffs()
        {
            // Act
            var result = await _sut.GetAllAsync();

            // Assert
            result.Should().NotBeNull();
            result.Should().HaveCount(8); // В OnModelCreating додано 8 тарифів
            result.Should().AllSatisfy(t =>
            {
                t.Name.Should().NotBeNullOrWhiteSpace();
                t.Price.Should().BeGreaterThan(0);
                t.ServiceTypeName.Should().NotBeNullOrWhiteSpace();
                t.DayType.Should().Match(d => d == "Weekday" || d == "Weekend");
            });
        }

        [Fact]
        public async Task GetByIdAsync_WhenTariffExists_ShouldReturnCorrectMappedDto()
        {
            // Arrange
            var existingTariffId = Guid.Parse("a0000000-0000-0000-0000-000000000001");

            // Act
            var result = await _sut.GetByIdAsync(existingTariffId);

            // Assert
            result.Should().NotBeNull();
            result!.Id.Should().Be(existingTariffId);
            result.Price.Should().Be(750.00m);
            result.ServiceType.Should().Be(ServiceType.EntranceTicketAdult);
            result.ServiceTypeName.Should().Be("EntranceTicketAdult");
            result.DayType.Should().Be("Weekend");
        }

        [Fact]
        public async Task GetByIdAsync_WhenTariffDoesNotExist_ShouldReturnNull()
        {
            // Act
            var result = await _sut.GetByIdAsync(Guid.NewGuid());

            // Assert
            result.Should().BeNull();
        }

        [Fact]
        public async Task GetByZoneAsync_ShouldReturnOnlyTariffsForGivenZone()
        {
            // Act
            var result = await _sut.GetByZoneAsync(VipZoneId);

            // Assert
            result.Should().NotBeNull();
            result.Should().HaveCount(2); // VIP має 2 тарифи на бунгало
            result.Should().OnlyContain(t => t.ZoneId == VipZoneId);
        }

        [Fact]
        public async Task GetByServiceTypeAsync_ShouldReturnOnlyMatchingServiceType()
        {
            // Act
            var result = await _sut.GetByServiceTypeAsync(ServiceType.Sunbed);

            // Assert
            result.Should().NotBeNull();
            result.Should().HaveCount(2); // 2 тарифи для шезлонгів (будній і вихідний)
            result.Should().OnlyContain(t => t.ServiceType == ServiceType.Sunbed);
        }

        [Theory]
        [InlineData("2026-09-26", "Weekend")] // Субота
        [InlineData("2026-09-27", "Weekend")] // Неділя
        [InlineData("2026-09-22", "Weekday")] // Вівторок
        [InlineData("2026-09-25", "Weekday")] // П'ятниця
        public async Task GetByDateAsync_ShouldFilterByCorrectDayType(string dateString, string expectedDayType)
        {
            // Arrange
            var date = DateTime.Parse(dateString);

            // Act
            var result = await _sut.GetByDateAsync(date);

            // Assert
            result.Should().NotBeNull();
            result.Should().NotBeEmpty();
            result.Should().OnlyContain(t => t.DayType == expectedDayType);
        }

        #endregion

        #region Create / Update / Delete Tests

        [Fact]
        public async Task CreateAsync_ValidTariff_ShouldPersistInDatabase()
        {
            // Arrange
            var newTariff = new Tariff
            {
                Id = Guid.NewGuid(),
                Name = "Новий абонемент",
                Price = 1200m,
                ServiceType = ServiceType.EntranceTicketAdult,
                DayType = DayType.Weekday,
                ZoneId = StandardZoneId
            };

            // Act
            var created = await _sut.CreateAsync(newTariff);

            // Assert
            created.Should().NotBeNull();
            var inDb = await _ctx.Tariffs.FindAsync(created.Id);
            inDb.Should().NotBeNull();
            inDb!.Name.Should().Be("Новий абонемент");
            inDb.Price.Should().Be(1200m);
        }

        [Fact]
        public async Task UpdateAsync_ExistingId_ShouldUpdateAllFields()
        {
            // Arrange
            var targetId = Guid.Parse("a0000000-0000-0000-0000-000000000008");
            var updateDto = new TariffUpdateDto
            {
                Name = "Оновлений лежак преміум",
                Price = 250m,
                ServiceType = ServiceType.Sunbed,
                DayType = DayType.Weekend,
                ZoneId = VipZoneId
            };

            // Act
            await _sut.UpdateAsync(targetId, updateDto);

            // Assert
            var updated = await _ctx.Tariffs.FindAsync(targetId);
            updated.Should().NotBeNull();
            updated!.Name.Should().Be("Оновлений лежак преміум");
            updated.Price.Should().Be(250m);
            updated.DayType.Should().Be(DayType.Weekend);
            updated.ZoneId.Should().Be(VipZoneId);
        }

        [Fact]
        public async Task UpdateAsync_NonExistingId_ShouldThrowKeyNotFoundException()
        {
            // Arrange
            var nonExistingId = Guid.NewGuid();
            var updateDto = new TariffUpdateDto
            {
                Name = "Неіснуючий",
                Price = 100m,
                ServiceType = ServiceType.Sunbed,
                DayType = DayType.Weekday,
                ZoneId = StandardZoneId
            };

            // Act
            var act = async () => await _sut.UpdateAsync(nonExistingId, updateDto);

            // Assert
            await act.Should().ThrowAsync<KeyNotFoundException>()
                .WithMessage($"*{nonExistingId}*");
        }

        [Fact]
        public async Task DeleteAsync_ExistingId_ShouldRemoveFromDatabase()
        {
            // Arrange
            var targetId = Guid.Parse("a0000000-0000-0000-0000-000000000007");

            // Act
            await _sut.DeleteAsync(targetId);

            // Assert
            var inDb = await _ctx.Tariffs.FindAsync(targetId);
            inDb.Should().BeNull();
        }

        [Fact]
        public async Task DeleteAsync_NonExistingId_ShouldThrowKeyNotFoundException()
        {
            // Arrange
            var nonExistingId = Guid.NewGuid();

            // Act
            var act = async () => await _sut.DeleteAsync(nonExistingId);

            // Assert
            await act.Should().ThrowAsync<KeyNotFoundException>()
                .WithMessage($"*{nonExistingId}*");
        }

        #endregion
    }
}