using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using AquaPass.Data;
using AquaPass.Enums;
using AquaPass.Models;
using AquaPass.ModelsDto;
using AquaPass.Services;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace AquaPass.Tests
{
    public class TicketServiceTests : IDisposable
    {
        private readonly AppDbContext _ctx;
        private readonly TicketService _sut;

        public TicketServiceTests()
        {
            var options = new DbContextOptionsBuilder<AppDbContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .Options;

            _ctx = new AppDbContext(options);
            _sut = new TicketService(_ctx);
        }

        public void Dispose()
        {
            _ctx.Database.EnsureDeleted();
            _ctx.Dispose();
        }

        // Хелпер для створення повного ланцюжка валідних зв'язків: Order + Tariff + Ticket
        private async Task<(Order Order, Ticket Ticket)> CreateOrderWithTicketAsync(
            string ticketCode,
            string orderStatus = "Confirmed",
            string ticketStatus = "Active",
            DateTime? visitDate = null,
            Sunbed? sunbed = null)
        {
            var tariff = new Tariff
            {
                Id = Guid.NewGuid(),
                Name = "Стандартний Дорослий",
                Price = 200m
            };
            _ctx.Tariffs.Add(tariff);

            var order = new Order
            {
                Id = Guid.NewGuid(),
                OrderNumber = $"ORD-{Guid.NewGuid().ToString()[..6].ToUpper()}",
                Status = orderStatus,
                VisitDate = visitDate ?? DateTime.UtcNow.Date,
                CustomerFirstName = "Олександр",
                CustomerLastName = "Коваль",
                CustomerEmail = "test@example.com",
                CustomerPhone = "+380501234567"
            };
            _ctx.Orders.Add(order);

            if (sunbed != null)
            {
                _ctx.Sunbeds.Add(sunbed);
            }

            var ticket = new Ticket
            {
                Id = Guid.NewGuid(),
                TicketCode = ticketCode,
                OrderId = order.Id,
                Order = order,
                EntranceTariffId = tariff.Id,
                EntranceTariff = tariff,
                EntrancePrice = tariff.Price,
                Status = ticketStatus,
                SunbedId = sunbed?.Id,
                Sunbed = sunbed,
                SunbedPrice = sunbed != null ? 150m : null
            };
            _ctx.Tickets.Add(ticket);

            await _ctx.SaveChangesAsync();
            return (order, ticket);
        }

        #region ValidateTicketAsync Tests

        [Fact]
        public async Task ValidateTicketAsync_WhenTicketNotFound_ShouldReturnFailure()
        {
            // Act
            var result = await _sut.ValidateTicketAsync("NON_EXISTENT_CODE");

            // Assert
            result.Should().NotBeNull();
            result.Success.Should().BeFalse();
            result.Message.Should().Contain("не знайдено");
        }

        [Fact]
        public async Task ValidateTicketAsync_WhenOrderIsCancelled_ShouldReturnFailure()
        {
            // Arrange
            var (_, ticket) = await CreateOrderWithTicketAsync(
                ticketCode: "TCK-CANCELLED",
                orderStatus: "Cancelled"
            );

            // Act
            var result = await _sut.ValidateTicketAsync(ticket.TicketCode);

            // Assert
            result.Success.Should().BeFalse();
            result.Message.Should().Contain("Замовлення скасовано");
        }

        [Fact]
        public async Task ValidateTicketAsync_WhenTicketIsAlreadyUsed_ShouldReturnFailure()
        {
            // Arrange
            var (_, ticket) = await CreateOrderWithTicketAsync(
                ticketCode: "TCK-USED",
                ticketStatus: "Used"
            );

            // Act
            var result = await _sut.ValidateTicketAsync(ticket.TicketCode);

            // Assert
            result.Success.Should().BeFalse();
            result.Message.Should().Contain("був використаний");
        }

        [Fact]
        public async Task ValidateTicketAsync_WhenVisitDateIsNotToday_ShouldReturnFailure()
        {
            // Arrange
            var tomorrow = DateTime.UtcNow.Date.AddDays(1);
            var (_, ticket) = await CreateOrderWithTicketAsync(
                ticketCode: "TCK-FUTURE",
                visitDate: tomorrow
            );

            // Act
            var result = await _sut.ValidateTicketAsync(ticket.TicketCode);

            // Assert
            result.Success.Should().BeFalse();
            result.Message.Should().Contain("Квиток недійсний на сьогодні");
        }

        [Fact]
        public async Task ValidateTicketAsync_WhenTicketIsValid_ShouldMarkAsUsedAndReturnSuccess()
        {
            // Arrange
            var sunbed = new Sunbed { Id = Guid.NewGuid(), Row = "B", Number = 12 };
            var (_, ticket) = await CreateOrderWithTicketAsync(
                ticketCode: "TCK-VALID",
                sunbed: sunbed
            );

            // Act
            var result = await _sut.ValidateTicketAsync("  TCK-VALID  ");

            // Assert
            result.Success.Should().BeTrue();
            result.Message.Should().Be("Прохід дозволено!");
            result.GuestName.Should().Be("Коваль Олександр");
            result.TariffName.Should().Be("Стандартний Дорослий");
            result.SunbedInfo.Should().Be("Ряд B, №12");

            var updatedTicket = await _ctx.Tickets.FindAsync(ticket.Id);
            updatedTicket!.Status.Should().Be("Used");
        }

        #endregion

        #region ValidateAllTicketsInOrderAsync Tests

        [Fact]
        public async Task ValidateAllTicketsInOrderAsync_WhenOrderNotFound_ShouldReturnFailure()
        {
            // Act
            var result = await _sut.ValidateAllTicketsInOrderAsync(Guid.NewGuid());

            // Assert
            result.Success.Should().BeFalse();
            result.Message.Should().Be("Замовлення не знайдено");
            result.ValidatedCount.Should().Be(0);
        }

        [Fact]
        public async Task ValidateAllTicketsInOrderAsync_WhenOrderCancelled_ShouldReturnFailure()
        {
            // Arrange
            var (order, _) = await CreateOrderWithTicketAsync("T1", orderStatus: "Cancelled");

            // Act
            var result = await _sut.ValidateAllTicketsInOrderAsync(order.Id);

            // Assert
            result.Success.Should().BeFalse();
            result.Message.Should().Be("Замовлення скасовано!");
        }

        [Fact]
        public async Task ValidateAllTicketsInOrderAsync_WhenDateIsNotToday_ShouldReturnFailure()
        {
            // Arrange
            var (order, _) = await CreateOrderWithTicketAsync("T1", visitDate: DateTime.UtcNow.Date.AddDays(-1));

            // Act
            var result = await _sut.ValidateAllTicketsInOrderAsync(order.Id);

            // Assert
            result.Success.Should().BeFalse();
            result.Message.Should().Contain("Квитки не на сьогодні");
        }

        [Fact]
        public async Task ValidateAllTicketsInOrderAsync_WhenAllTicketsAlreadyUsed_ShouldReturnFailure()
        {
            // Arrange
            var (order, _) = await CreateOrderWithTicketAsync("T1", ticketStatus: "Used");

            // Act
            var result = await _sut.ValidateAllTicketsInOrderAsync(order.Id);

            // Assert
            result.Success.Should().BeFalse();
            result.Message.Should().Contain("вже були погашені раніше");
        }

        [Fact]
        public async Task ValidateAllTicketsInOrderAsync_WhenTicketsPending_ShouldValidateOnlyPending()
        {
            // Arrange
            var (order, _) = await CreateOrderWithTicketAsync("T1", ticketStatus: "Active");

            // Додаємо другий квиток у це ж замовлення
            var tariff = await _ctx.Tariffs.FirstAsync();
            var t2 = new Ticket
            {
                Id = Guid.NewGuid(),
                TicketCode = "T2",
                OrderId = order.Id,
                Order = order,
                EntranceTariffId = tariff.Id,
                EntranceTariff = tariff,
                Status = "Active"
            };
            var t3 = new Ticket
            {
                Id = Guid.NewGuid(),
                TicketCode = "T3",
                OrderId = order.Id,
                Order = order,
                EntranceTariffId = tariff.Id,
                EntranceTariff = tariff,
                Status = "Used"
            };

            _ctx.Tickets.AddRange(t2, t3);
            await _ctx.SaveChangesAsync();

            // Act
            var result = await _sut.ValidateAllTicketsInOrderAsync(order.Id);

            // Assert
            result.Success.Should().BeTrue();
            result.ValidatedCount.Should().Be(2);

            var tickets = await _ctx.Tickets.Where(t => t.OrderId == order.Id).ToListAsync();
            tickets.Should().OnlyContain(t => t.Status == "Used");
        }

        #endregion

        #region GetOrderByTicketCodeAsync Tests

        [Fact]
        public async Task GetOrderByTicketCodeAsync_WhenNotFound_ShouldReturnNull()
        {
            // Act
            var result = await _sut.GetOrderByTicketCodeAsync("UNKNOWN");

            // Assert
            result.Should().BeNull();
        }

        [Fact]
        public async Task GetOrderByTicketCodeAsync_WhenFound_ShouldMapCorrectDtoAndFallbackEmailIfNameEmpty()
        {
            // Arrange
            var (order, ticket) = await CreateOrderWithTicketAsync("TCK-SEARCH-1");
            order.CustomerFirstName = "";
            order.CustomerLastName = "";
            order.CustomerEmail = "fallback@example.com";
            await _ctx.SaveChangesAsync();

            // Act
            var result = await _sut.GetOrderByTicketCodeAsync(" TCK-SEARCH-1 ");

            // Assert
            result.Should().NotBeNull();
            result!.GuestName.Should().Be("fallback@example.com");
            result.CustomerPhone.Should().Be("+380501234567");
            result.OrderStatus.Should().Be(OrderStatus.Confirmed);
            result.Tickets.Should().HaveCount(1);
        }

        #endregion

        #region GetTicketQrCodeAsync Tests

        [Fact]
        public async Task GetTicketQrCodeAsync_WhenTicketDoesNotExist_ShouldReturnNull()
        {
            // Act
            var result = await _sut.GetTicketQrCodeAsync("NON_EXISTENT");

            // Assert
            result.Should().BeNull();
        }

        [Fact]
        public async Task GetTicketQrCodeAsync_WhenTicketExists_ShouldReturnPngByteArray()
        {
            // Arrange
            var (_, ticket) = await CreateOrderWithTicketAsync("QR-VALID-123");

            // Act
            var result = await _sut.GetTicketQrCodeAsync("QR-VALID-123");

            // Assert
            result.Should().NotBeNull();
            result!.Length.Should().BeGreaterThan(0);
        }

        #endregion

        #region GetTicketByCodeAsync Tests

        [Fact]
        public async Task GetTicketByCodeAsync_WhenTicketNotFound_ShouldReturnNull()
        {
            // Act
            var result = await _sut.GetTicketByCodeAsync("NOT_FOUND");

            // Assert
            result.Should().BeNull();
        }

        [Fact]
        public async Task GetTicketByCodeAsync_WhenTicketFound_ShouldReturnMappedDto()
        {
            // Arrange
            var sunbed = new Sunbed { Id = Guid.NewGuid(), Row = "A", Number = 5 };
            var (_, ticket) = await CreateOrderWithTicketAsync("TCK-DTO", sunbed: sunbed);

            // Act
            var result = await _sut.GetTicketByCodeAsync("TCK-DTO");

            // Assert
            result.Should().NotBeNull();
            result!.TicketCode.Should().Be("TCK-DTO");
            result.Status.Should().Be("Active");
        }

        #endregion
    }
}