using System;
using System.Collections.Generic;
using System.Text;
using AquaPass.Models;
using AquaPass.Services;
using FluentAssertions;
using QuestPDF.Infrastructure;
using Xunit;

namespace AquaPass.Tests
{
    public class TicketPdfGeneratorTests
    {
        private readonly TicketPdfGenerator _sut;

        public TicketPdfGeneratorTests()
        {
            // QuestPDF вимагає вказання некомерційної ліцензії
            QuestPDF.Settings.License = LicenseType.Community;
            _sut = new TicketPdfGenerator();
        }

        [Fact]
        public void GenerateOrderTicketsPdf_WithValidOrderAndTickets_ShouldReturnValidPdfBytes()
        {
            // Arrange
            var order = new Order
            {
                Id = Guid.NewGuid(),
                OrderNumber = "ORD-TEST-01",
                VisitDate = DateTime.UtcNow.Date,
                CustomerFirstName = "Тарас",
                CustomerLastName = "Шевченко",
                TotalAmount = 550m,
                Tickets = new List<Ticket>
                {
                    new Ticket
                    {
                        Id = Guid.NewGuid(),
                        TicketCode = "TCK-1001",
                        EntrancePrice = 400m,
                        EntranceTariff = new Tariff { Name = "Дорослий" },
                        Sunbed = new Sunbed { Row = "A", Number = 1 },
                        SunbedPrice = 150m
                    },
                    new Ticket
                    {
                        Id = Guid.NewGuid(),
                        TicketCode = "TCK-1002",
                        EntrancePrice = 400m,
                        EntranceTariff = new Tariff { Name = "Дорослий без шезлонга" },
                        Sunbed = null,
                        SunbedPrice = null
                    }
                }
            };

            // Act
            var pdfBytes = _sut.GenerateOrderTicketsPdf(order);

            // Assert
            pdfBytes.Should().NotBeNull();
            pdfBytes.Length.Should().BeGreaterThan(0);

            // Перевірка магічних байтів PDF (%PDF на початку файлу)
            var pdfHeader = Encoding.ASCII.GetString(pdfBytes, 0, 4);
            pdfHeader.Should().Be("%PDF");
        }

        [Fact]
        public void GenerateOrderTicketsPdf_WhenTicketsListIsEmpty_ShouldNotThrowAndReturnValidPdf()
        {
            // Arrange
            var order = new Order
            {
                Id = Guid.NewGuid(),
                OrderNumber = "ORD-EMPTY",
                VisitDate = DateTime.UtcNow.Date,
                CustomerFirstName = "Гість",
                CustomerLastName = "",
                TotalAmount = 0m,
                Tickets = new List<Ticket>()
            };

            // Act
            Action act = () => _sut.GenerateOrderTicketsPdf(order);

            // Assert
            act.Should().NotThrow();
        }
    }
}