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
    public class OrderServiceTests : IDisposable
    {
        private readonly AppDbContext _ctx;
        private readonly OrderService _sut;
        private static readonly Guid StandardZoneId = Guid.Parse("22222222-2222-2222-2222-222222222222");

        // Ідентифікатори тарифів із Seed Data в AppDbContext
        private static readonly Guid AdultWeekdayTariffId = Guid.Parse("a0000000-0000-0000-0000-000000000003"); // 550 грн
        private static readonly Guid AdultWeekendTariffId = Guid.Parse("a0000000-0000-0000-0000-000000000001"); // 750 грн

        public OrderServiceTests()
        {
            var options = new DbContextOptionsBuilder<AppDbContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .Options;

            _ctx = new AppDbContext(options);
            _ctx.Database.EnsureCreated(); // Застосовує Seed Data для Zone і Tariff

            _sut = new OrderService(_ctx);
        }

        public void Dispose()
        {
            _ctx.Database.EnsureDeleted();
            _ctx.Dispose();
        }

        #region CreateOrderAsync Tests

        [Fact]
        public async Task CreateOrderAsync_WhenDataIsValid_ShouldPersistOrderAndReturnCorrectDto()
        {
            // Arrange
            // 2026-09-23 - Середа (Weekday)
            var visitDate = new DateTime(2026, 9, 23, 0, 0, 0, DateTimeKind.Utc);

            var sunbed = new Sunbed
            {
                Id = Guid.NewGuid(),
                Row = "A",
                Number = 10,
                ZoneId = StandardZoneId
            };
            _ctx.Sunbeds.Add(sunbed);
            await _ctx.SaveChangesAsync();

            var dto = new CreateOrderDto
            {
                CustomerFirstName = "Богдан",
                CustomerLastName = "Хмельницький",
                CustomerEmail = "bogdan@example.com",
                CustomerPhone = "+380501112233",
                VisitDate = visitDate,
                Items = new List<OrderItemRequestDto>
                {
                    new OrderItemRequestDto
                    {
                        TariffId = AdultWeekdayTariffId,
                        Quantity = 1,
                        SunbedId = sunbed.Id
                    }
                }
            };

            // Act
            var result = await _sut.CreateOrderAsync(dto);

            // Assert
            result.Should().NotBeNull();
            result.CustomerFirstName.Should().Be("Богдан");
            result.Status.Should().Be("Pending");
            result.Tickets.Should().HaveCount(1);

            // Вхідний дорослий у будній (550 грн) + шезлонг у будній (150 грн) = 700 грн
            result.TotalAmount.Should().Be(700m);
            result.Tickets.First().SunbedDetails.Should().Be("Ряд A, №10");

            var inDb = await _ctx.Orders.Include(o => o.Tickets).FirstOrDefaultAsync(o => o.Id == result.OrderId);
            inDb.Should().NotBeNull();
            inDb!.TotalAmount.Should().Be(700m);
            inDb.Tickets.Should().HaveCount(1);
        }

        [Fact]
        public async Task CreateOrderAsync_WhenTariffNotFound_ShouldThrowException()
        {
            // Arrange
            var nonExistingTariffId = Guid.NewGuid();
            var dto = new CreateOrderDto
            {
                CustomerFirstName = "Гість",
                CustomerLastName = "Тест",
                CustomerEmail = "guest@example.com",
                CustomerPhone = "+380501112233",
                VisitDate = new DateTime(2026, 9, 23, 0, 0, 0, DateTimeKind.Utc),
                Items = new List<OrderItemRequestDto>
                {
                    new OrderItemRequestDto
                    {
                        TariffId = nonExistingTariffId,
                        Quantity = 1,
                        SunbedId = null
                    }
                }
            };

            // Act
            Func<Task> act = async () => await _sut.CreateOrderAsync(dto);

            // Assert
            await act.Should().ThrowAsync<Exception>()
                .WithMessage($"*Тариф з ID {nonExistingTariffId} не знайдено*");
        }

        [Fact]
        public async Task CreateOrderAsync_WhenWeekendTariffSelectedForWeekdayDate_ShouldThrowException()
        {
            // Arrange
            // 2026-09-23 - Середа (Weekday), а тариф обрано вихідного дня (AdultWeekendTariffId)
            var weekdayDate = new DateTime(2026, 9, 23, 0, 0, 0, DateTimeKind.Utc);

            var dto = new CreateOrderDto
            {
                CustomerFirstName = "Гість",
                CustomerLastName = "Тест",
                CustomerEmail = "guest@example.com",
                CustomerPhone = "+380501112233",
                VisitDate = weekdayDate,
                Items = new List<OrderItemRequestDto>
                {
                    new OrderItemRequestDto
                    {
                        TariffId = AdultWeekendTariffId,
                        Quantity = 1,
                        SunbedId = null
                    }
                }
            };

            // Act
            Func<Task> act = async () => await _sut.CreateOrderAsync(dto);

            // Assert
            await act.Should().ThrowAsync<Exception>()
                .WithMessage("*не діє для обраної дати*");
        }

        [Fact]
        public async Task CreateOrderAsync_WhenSameSunbedSelectedTwiceInSameOrder_ShouldThrowException()
        {
            // Arrange
            var duplicateSunbedId = Guid.NewGuid();
            var visitDate = new DateTime(2026, 9, 23, 0, 0, 0, DateTimeKind.Utc);

            var dto = new CreateOrderDto
            {
                CustomerFirstName = "Гість",
                CustomerLastName = "Тест",
                CustomerEmail = "guest@example.com",
                CustomerPhone = "+380501112233",
                VisitDate = visitDate,
                Items = new List<OrderItemRequestDto>
                {
                    new OrderItemRequestDto
                    {
                        TariffId = AdultWeekdayTariffId,
                        Quantity = 1,
                        SunbedId = duplicateSunbedId
                    },
                    new OrderItemRequestDto
                    {
                        TariffId = AdultWeekdayTariffId,
                        Quantity = 1,
                        SunbedId = duplicateSunbedId
                    }
                }
            };

            // Act
            Func<Task> act = async () => await _sut.CreateOrderAsync(dto);

            // Assert
            await act.Should().ThrowAsync<Exception>()
                .WithMessage("*Неможливо обрати один і той самий шезлонг двічі*");
        }

        [Fact]
        public async Task CreateOrderAsync_WhenSunbedAlreadyOccupiedOnSameDate_ShouldThrowException()
        {
            // Arrange
            var visitDate = new DateTime(2026, 9, 23, 0, 0, 0, DateTimeKind.Utc);
            var sunbed = new Sunbed { Id = Guid.NewGuid(), Row = "B", Number = 5, ZoneId = StandardZoneId };
            _ctx.Sunbeds.Add(sunbed);

            var existingOrder = new Order
            {
                Id = Guid.NewGuid(),
                OrderNumber = "ORD-OCCUPIED",
                VisitDate = visitDate,
                Status = "Confirmed",
                CustomerEmail = "user1@example.com",
                CustomerPhone = "+380501111111",
                CustomerFirstName = "Перший",
                CustomerLastName = "Клієнт"
            };

            var existingTicket = new Ticket
            {
                Id = Guid.NewGuid(),
                OrderId = existingOrder.Id,
                Order = existingOrder,
                SunbedId = sunbed.Id,
                Sunbed = sunbed,
                EntranceTariffId = AdultWeekdayTariffId,
                Status = "Active",
                TicketCode = "TCK-OCCUPIED"
            };

            _ctx.Orders.Add(existingOrder);
            _ctx.Tickets.Add(existingTicket);
            await _ctx.SaveChangesAsync();

            var newOrderDto = new CreateOrderDto
            {
                CustomerFirstName = "Другий",
                CustomerLastName = "Клієнт",
                CustomerEmail = "user2@example.com",
                CustomerPhone = "+380502222222",
                VisitDate = visitDate,
                Items = new List<OrderItemRequestDto>
                {
                    new OrderItemRequestDto
                    {
                        TariffId = AdultWeekdayTariffId,
                        Quantity = 1,
                        SunbedId = sunbed.Id
                    }
                }
            };

            // Act
            Func<Task> act = async () => await _sut.CreateOrderAsync(newOrderDto);

            // Assert
            await act.Should().ThrowAsync<Exception>()
                .WithMessage("*Один або декілька обраних шезлонгів уже зайняті на цю дату*");
        }

        [Fact]
        public async Task CreateOrderAsync_WhenSunbedWasInCancelledOrder_ShouldAllowBooking()
        {
            // Arrange
            var visitDate = new DateTime(2026, 9, 23, 0, 0, 0, DateTimeKind.Utc);
            var sunbed = new Sunbed { Id = Guid.NewGuid(), Row = "C", Number = 1, ZoneId = StandardZoneId };
            _ctx.Sunbeds.Add(sunbed);

            var cancelledOrder = new Order
            {
                Id = Guid.NewGuid(),
                OrderNumber = "ORD-CANCELLED",
                VisitDate = visitDate,
                Status = "Cancelled", // Скасоване замовлення не блокує шезлонг
                CustomerEmail = "cancelled@example.com",
                CustomerPhone = "+380501111111",
                CustomerFirstName = "Скасований",
                CustomerLastName = "Клієнт"
            };

            var cancelledTicket = new Ticket
            {
                Id = Guid.NewGuid(),
                OrderId = cancelledOrder.Id,
                Order = cancelledOrder,
                SunbedId = sunbed.Id,
                Sunbed = sunbed,
                EntranceTariffId = AdultWeekdayTariffId,
                Status = "Cancelled",
                TicketCode = "TCK-CANCEL"
            };

            _ctx.Orders.Add(cancelledOrder);
            _ctx.Tickets.Add(cancelledTicket);
            await _ctx.SaveChangesAsync();

            var newOrderDto = new CreateOrderDto
            {
                CustomerFirstName = "Новий",
                CustomerLastName = "Клієнт",
                CustomerEmail = "new@example.com",
                CustomerPhone = "+380503333333",
                VisitDate = visitDate,
                Items = new List<OrderItemRequestDto>
                {
                    new OrderItemRequestDto
                    {
                        TariffId = AdultWeekdayTariffId,
                        Quantity = 1,
                        SunbedId = sunbed.Id
                    }
                }
            };

            // Act
            var result = await _sut.CreateOrderAsync(newOrderDto);

            // Assert
            result.Should().NotBeNull();
            result.Tickets.Should().ContainSingle(t => t.SunbedDetails == "Ряд C, №1");
        }

        #endregion

        #region GetOrdersByPeriodAsync Tests

        [Fact]
        public async Task GetOrdersByPeriodAsync_ShouldReturnOrdersWithinPeriodSortedByCreatedAtDescending()
        {
            // Arrange
            var date1 = new DateTime(2026, 9, 10, 0, 0, 0, DateTimeKind.Utc);
            var date2 = new DateTime(2026, 9, 15, 0, 0, 0, DateTimeKind.Utc);
            var outOfRangeDate = new DateTime(2026, 9, 25, 0, 0, 0, DateTimeKind.Utc);

            var order1 = new Order
            {
                Id = Guid.NewGuid(),
                OrderNumber = "ORD-P1",
                VisitDate = date1,
                Status = "Confirmed",
                CustomerEmail = "p1@example.com",
                CustomerPhone = "+380501111111",
                CustomerFirstName = "A",
                CustomerLastName = "A",
                CreatedAt = DateTime.UtcNow.AddHours(-2)
            };

            var order2 = new Order
            {
                Id = Guid.NewGuid(),
                OrderNumber = "ORD-P2",
                VisitDate = date2,
                Status = "Confirmed",
                CustomerEmail = "p2@example.com",
                CustomerPhone = "+380502222222",
                CustomerFirstName = "B",
                CustomerLastName = "B",
                CreatedAt = DateTime.UtcNow.AddHours(-1) // Створено пізніше
            };

            var orderOutside = new Order
            {
                Id = Guid.NewGuid(),
                OrderNumber = "ORD-OUT",
                VisitDate = outOfRangeDate,
                Status = "Confirmed",
                CustomerEmail = "out@example.com",
                CustomerPhone = "+380503333333",
                CustomerFirstName = "C",
                CustomerLastName = "C",
                CreatedAt = DateTime.UtcNow
            };

            _ctx.Orders.AddRange(order1, order2, orderOutside);
            await _ctx.SaveChangesAsync();

            // Act
            var results = await _sut.GetOrdersByPeriodAsync(
                fromDate: new DateTime(2026, 9, 10),
                toDate: new DateTime(2026, 9, 20)
            );

            // Assert
            results.Should().HaveCount(2);
            results.Select(r => r.OrderNumber).Should().Contain(new[] { "ORD-P1", "ORD-P2" });
            results.First().OrderNumber.Should().Be("ORD-P2"); // Першим іде новіший за CreatedAt
        }

        #endregion

        #region GetOrderByIdAsync Tests

        [Fact]
        public async Task GetOrderByIdAsync_WhenOrderExists_ShouldReturnMappedDtoWithTickets()
        {
            // Arrange
            var sunbed = new Sunbed { Id = Guid.NewGuid(), Row = "A", Number = 1, ZoneId = StandardZoneId };
            _ctx.Sunbeds.Add(sunbed);

            var order = new Order
            {
                Id = Guid.NewGuid(),
                OrderNumber = "ORD-FIND-ME",
                VisitDate = DateTime.UtcNow.Date,
                Status = "Confirmed",
                CustomerEmail = "findme@example.com",
                CustomerPhone = "+380507777777",
                CustomerFirstName = "Ярослав",
                CustomerLastName = "Мудрий",
                TotalAmount = 550m,
                CreatedAt = DateTime.UtcNow
            };

            var ticket = new Ticket
            {
                Id = Guid.NewGuid(),
                OrderId = order.Id,
                Order = order,
                EntranceTariffId = AdultWeekdayTariffId,
                SunbedId = sunbed.Id,
                Sunbed = sunbed,
                EntrancePrice = 400m,
                SunbedPrice = 150m,
                TicketCode = "TCK-FIND-01",
                Status = "Active"
            };

            _ctx.Orders.Add(order);
            _ctx.Tickets.Add(ticket);
            await _ctx.SaveChangesAsync();

            // Act
            var result = await _sut.GetOrderByIdAsync(order.Id);

            // Assert
            result.Should().NotBeNull();
            result!.OrderId.Should().Be(order.Id);
            result.OrderNumber.Should().Be("ORD-FIND-ME");
            result.Tickets.Should().HaveCount(1);
            result.Tickets.First().SunbedDetails.Should().Be("Ряд A, №1");
            result.Tickets.First().TotalTicketPrice.Should().Be(550m);
        }

        [Fact]
        public async Task GetOrderByIdAsync_WhenOrderDoesNotExist_ShouldReturnNull()
        {
            // Act
            var result = await _sut.GetOrderByIdAsync(Guid.NewGuid());

            // Assert
            result.Should().BeNull();
        }

        #endregion
    }
}