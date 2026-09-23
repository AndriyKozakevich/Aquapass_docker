using System;
using AquaPass.Services;
using FluentAssertions;
using Xunit;

namespace AquaPass.Tests
{
    public class QrCodeServiceTests
    {
        private readonly QrCodeService _sut;

        public QrCodeServiceTests()
        {
            _sut = new QrCodeService();
        }

        [Fact]
        public void GeneratePngQrCode_WhenPayloadIsValid_ShouldReturnValidPngByteArray()
        {
            // Arrange
            const string payload = "https://aquapass.ua/tickets/scan/TCK-998877";

            // Act
            var result = _sut.GeneratePngQrCode(payload);

            // Assert
            result.Should().NotBeNull();
            result.Length.Should().BeGreaterThan(0);

            // Перевірка магічних байтів PNG файлу (0x89, 'P', 'N', 'G')
            result.Length.Should().BeGreaterThanOrEqualTo(4);
            result[0].Should().Be(0x89);
            result[1].Should().Be(0x50); // 'P'
            result[2].Should().Be(0x4E); // 'N'
            result[3].Should().Be(0x47); // 'G'
        }

        [Theory]
        [InlineData("123456")]
        [InlineData("Квиток: 123-АкваПас")]
        [InlineData("ea624b59-cb14-4366-9694-811c75c8793b")]
        public void GeneratePngQrCode_WithDifferentPayloadTypes_ShouldProduceNonEmptyOutput(string payload)
        {
            // Act
            var result = _sut.GeneratePngQrCode(payload);

            // Assert
            result.Should().NotBeNull();
            result.Length.Should().BeGreaterThan(0);
        }

        [Fact]
        public void GeneratePngQrCode_WhenPayloadIsEmpty_ShouldNotThrowAndReturnValidPng()
        {
            // Act
            Action act = () => _sut.GeneratePngQrCode(string.Empty);

            // Assert
            act.Should().NotThrow();
            var result = _sut.GeneratePngQrCode(string.Empty);
            result.Should().NotBeNull();
            result.Length.Should().BeGreaterThan(0);
        }
    }
}