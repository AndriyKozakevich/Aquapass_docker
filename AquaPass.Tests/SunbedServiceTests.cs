using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using AquaPass.Data; // або AquaPass.Models — простір імен вашого AppDbContext
using AquaPass.Models;
using AquaPass.ModelsDto;
using AquaPass.Services;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Moq;
using Xunit;

namespace AquaPass.Tests
{
    public class SunbedServiceTests : IDisposable
    {
        private readonly AppDbContext _ctx;
        private readonly Mock<ISunbedHoldService> _holdMock;
        private readonly SunbedService _sut; // System Under Test

        public SunbedServiceTests()
        {
            var options = new DbContextOptionsBuilder<AppDbContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .Options;

            _ctx = new AppDbContext(options);
            _holdMock = new Mock<ISunbedHoldService>();

            // За замовчуванням блокувань у Redis немає
            _holdMock.Setup(h => h.GetHeldSunbedIdsAsync(It.IsAny<DateTime>(), It.IsAny<string?>()))
                .ReturnsAsync(new HashSet<Guid>());

            _sut = new SunbedService(_ctx, _holdMock.Object);
        }

        public void Dispose()
        {
            _ctx.Database.EnsureDeleted();
            _ctx.Dispose();
        }

        [Fact]
        public async Task GetAvailableSunbedsAsync_WhenNoOrdersAndNoHolds_ShouldReturnAllAsAvailable()
        {
            // Arrange
            var s1 = new Sunbed { Id = Guid.NewGuid(), Number = 1, Row = "A", ZoneId = Guid.NewGuid() };
            var s2 = new Sunbed { Id = Guid.NewGuid(), Number = 2, Row = "A", ZoneId = Guid.NewGuid() };

            _ctx.Sunbeds.AddRange(s1, s2);
            await _ctx.SaveChangesAsync();

            // Act
            var result = await _sut.GetAvailableSunbedsAsync(DateTime.UtcNow.Date, null);

            // Assert
            result.Should().NotBeNull();
            result.Should().HaveCount(2);
            result.Should().OnlyContain(x => x.IsAvailable == true);
        }

        [Fact]
        public async Task GetAvailableSunbedsAsync_WhenSunbedHasPaidTicketOnDate_ShouldReturnAsUnavailable()
        {
            // Arrange
            var sunbedId = Guid.NewGuid();
            var sunbed = new Sunbed { Id = sunbedId, Number = 1, Row = "A", ZoneId = Guid.NewGuid() };
            _ctx.Sunbeds.Add(sunbed);

            var visitDate = DateTime.UtcNow.Date;
            var order = new Order { Id = Guid.NewGuid(), VisitDate = visitDate, Status = "Paid" };
            var ticket = new Ticket { Id = Guid.NewGuid(), OrderId = order.Id, Order = order, SunbedId = sunbedId };

            _ctx.Orders.Add(order);
            _ctx.Tickets.Add(ticket);
            await _ctx.SaveChangesAsync();

            // Act
            var result = await _sut.GetAvailableSunbedsAsync(visitDate, null);

            // Assert
            result.Should().ContainSingle();
            result.First().IsAvailable.Should().BeFalse();
        }

        [Fact]
        public async Task GetAvailableSunbedsAsync_WhenTicketIsOnDifferentDate_ShouldReturnAsAvailable()
        {
            // Arrange
            var sunbedId = Guid.NewGuid();
            var sunbed = new Sunbed { Id = sunbedId, Number = 1, Row = "A", ZoneId = Guid.NewGuid() };
            _ctx.Sunbeds.Add(sunbed);

            var visitDate = DateTime.UtcNow.Date;
            var otherDate = visitDate.AddDays(1);
            var order = new Order { Id = Guid.NewGuid(), VisitDate = otherDate, Status = "Paid" };
            var ticket = new Ticket { Id = Guid.NewGuid(), OrderId = order.Id, Order = order, SunbedId = sunbedId };

            _ctx.Orders.Add(order);
            _ctx.Tickets.Add(ticket);
            await _ctx.SaveChangesAsync();

            // Act
            var result = await _sut.GetAvailableSunbedsAsync(visitDate, null);

            // Assert
            result.Should().ContainSingle();
            result.First().IsAvailable.Should().BeTrue();
        }

        [Fact]
        public async Task GetAvailableSunbedsAsync_WhenHeldByAnotherUser_ShouldReturnAsUnavailable()
        {
            // Arrange
            var sunbedId = Guid.NewGuid();
            var sunbed = new Sunbed { Id = sunbedId, Number = 1, Row = "A", ZoneId = Guid.NewGuid() };
            _ctx.Sunbeds.Add(sunbed);
            await _ctx.SaveChangesAsync();

            var visitDate = DateTime.UtcNow.Date;

            // Імітуємо блокування чужим токеном
            _holdMock.Setup(h => h.GetHeldSunbedIdsAsync(visitDate, "currentToken"))
                .ReturnsAsync(new HashSet<Guid> { sunbedId });

            // Act
            var result = await _sut.GetAvailableSunbedsAsync(visitDate, "currentToken");

            // Assert
            result.Should().ContainSingle();
            result.First().IsAvailable.Should().BeFalse();
        }

        [Fact]
        public async Task GetAvailableSunbedsAsync_WhenHeldByCurrentUser_ShouldReturnAsAvailable()
        {
            // Arrange
            var sunbedId = Guid.NewGuid();
            var sunbed = new Sunbed { Id = sunbedId, Number = 1, Row = "A", ZoneId = Guid.NewGuid() };
            _ctx.Sunbeds.Add(sunbed);
            await _ctx.SaveChangesAsync();

            var visitDate = DateTime.UtcNow.Date;
            const string myToken = "token123";

            // Якщо токен свій, HoldService не включає цей ID до недоступних
            _holdMock.Setup(h => h.GetHeldSunbedIdsAsync(visitDate, myToken))
                .ReturnsAsync(new HashSet<Guid>());

            // Act
            var result = await _sut.GetAvailableSunbedsAsync(visitDate, myToken);

            // Assert
            result.Should().ContainSingle();
            result.First().IsAvailable.Should().BeTrue();
        }

        [Fact]
        public async Task CreateAsync_ValidDto_ShouldPersistAndReturnSunbed()
        {
            // Arrange
            var createDto = new SunbedCreateDto { Number = 5, Row = "B", ZoneId = Guid.Empty };

            // Act
            var created = await _sut.CreateAsync(createDto);

            // Assert
            created.Should().NotBeNull();
            created.Number.Should().Be(5);
            created.Row.Should().Be("B");

            var inDb = await _ctx.Sunbeds.FindAsync(created.Id);
            inDb.Should().NotBeNull();
            inDb!.Number.Should().Be(5);
        }

        [Fact]
        public async Task UpdateAsync_ExistingId_ShouldUpdateFields()
        {
            // Arrange
            var sunbed = new Sunbed { Id = Guid.NewGuid(), Number = 1, Row = "A", ZoneId = Guid.NewGuid() };
            _ctx.Sunbeds.Add(sunbed);
            await _ctx.SaveChangesAsync();

            var updateDto = new SunbedUpdateDto { Number = 10, Row = "C" };

            // Act
            await _sut.UpdateAsync(sunbed.Id, updateDto);

            // Assert
            var updated = await _sut.GetByIdAsync(sunbed.Id);
            updated.Should().NotBeNull();
            updated.Number.Should().Be(10);
            updated.Row.Should().Be("C");
        }

        [Fact]
        public async Task DeleteAsync_ExistingId_ShouldRemoveFromDatabase()
        {
            // Arrange
            var sunbed = new Sunbed { Id = Guid.NewGuid(), Number = 1, Row = "A", ZoneId = Guid.NewGuid() };
            _ctx.Sunbeds.Add(sunbed);
            await _ctx.SaveChangesAsync();

            // Act
            await _sut.DeleteAsync(sunbed.Id);

            // Assert
            var inDb = await _ctx.Sunbeds.FindAsync(sunbed.Id);
            inDb.Should().BeNull();

            var act = async () => await _sut.GetByIdAsync(sunbed.Id);
            await act.Should().ThrowAsync<KeyNotFoundException>();
        }

        [Fact]
        public async Task DeleteAsync_NonExistingId_ShouldThrowKeyNotFoundException()
        {
            // Act
            var act = async () => await _sut.DeleteAsync(Guid.NewGuid());

            // Assert
            await act.Should().ThrowAsync<KeyNotFoundException>();
        }
    }
}