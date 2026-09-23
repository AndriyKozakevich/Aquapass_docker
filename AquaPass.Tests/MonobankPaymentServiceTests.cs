using System;
using System.Net;
using System.Net.Http;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using AquaPass.ModelsDto.Monobank;
using AquaPass.Services;
using FluentAssertions;
using Microsoft.Extensions.Configuration;
using Moq;
using Moq.Protected;
using Xunit;

namespace AquaPass.Tests
{
    public class MonobankPaymentServiceTests
    {
        private readonly Mock<IConfiguration> _configMock;
        private readonly Mock<HttpMessageHandler> _httpMessageHandlerMock;
        private readonly HttpClient _httpClient;

        public MonobankPaymentServiceTests()
        {
            _configMock = new Mock<IConfiguration>();
            _httpMessageHandlerMock = new Mock<HttpMessageHandler>();
            _httpClient = new HttpClient(_httpMessageHandlerMock.Object);
        }

        #region Fallback / Dev Mode Tests

        [Theory]
        [InlineData(null)]
        [InlineData("")]
        [InlineData("   ")]
        [InlineData("YOUR_MONOBANK_TOKEN_HERE")]
        [InlineData("test_secret_token_123")]
        public async Task CreateInvoiceAsync_WhenTokenIsMissingOrDevToken_ShouldReturnMockInvoiceWithoutCallingApi(string? devToken)
        {
            // Arrange
            var orderId = Guid.NewGuid();
            _configMock.Setup(c => c["Monobank:Token"]).Returns(devToken);
            _configMock.Setup(c => c["Monobank:RedirectUrl"]).Returns("http://localhost:3000/booking");

            var sut = new MonobankPaymentService(_httpClient, _configMock.Object);

            // Act
            var result = await sut.CreateInvoiceAsync(orderId, 550m, "Вхідні квитки");

            // Assert
            result.Should().NotBeNull();
            result!.InvoiceId.Should().NotBeNullOrWhiteSpace();
            result.PageUrl.Should().Be($"http://localhost:3000/booking?orderId={orderId}&paid=true");

            // Переконуємось, що жоден HTTP-запит до зовнішнього сервера не надсилався
            _httpMessageHandlerMock.Protected().Verify(
                "SendAsync",
                Times.Never(),
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>()
            );
        }

        #endregion

        #region Production / Real API Tests

        [Fact]
        public async Task CreateInvoiceAsync_WhenTokenIsValidAndApiReturnsOk_ShouldReturnDeserializedResponse()
        {
            // Arrange
            var orderId = Guid.NewGuid();
            const string realToken = "uRealValidProductionMonobankToken";
            _configMock.Setup(c => c["Monobank:Token"]).Returns(realToken);
            _configMock.Setup(c => c["Monobank:RedirectUrl"]).Returns("https://aquapass.ua/booking");
            _configMock.Setup(c => c["Monobank:WebhookUrl"]).Returns("https://aquapass.ua/api/payments/webhook");

            var expectedResponse = new MonoCreateInvoiceResponse
            {
                InvoiceId = "mono_inv_987654321",
                PageUrl = "https://pay.mbank.biz/inv_987654321"
            };

            var jsonContent = JsonSerializer.Serialize(expectedResponse);

            _httpMessageHandlerMock.Protected()
                .Setup<Task<HttpResponseMessage>>(
                    "SendAsync",
                    ItExpr.Is<HttpRequestMessage>(req =>
                        req.Method == HttpMethod.Post &&
                        req.RequestUri!.ToString() == "https://api.monobank.ua/api/merchant/invoice/create" &&
                        req.Headers.Contains("X-Token")),
                    ItExpr.IsAny<CancellationToken>()
                )
                .ReturnsAsync(new HttpResponseMessage
                {
                    StatusCode = HttpStatusCode.OK,
                    Content = new StringContent(jsonContent)
                });

            var sut = new MonobankPaymentService(_httpClient, _configMock.Object);

            // Act
            var result = await sut.CreateInvoiceAsync(orderId, 750m, "Оплата AquaPass");

            // Assert
            result.Should().NotBeNull();
            result!.InvoiceId.Should().Be("mono_inv_987654321");
            result.PageUrl.Should().Be("https://pay.mbank.biz/inv_987654321");

            _httpMessageHandlerMock.Protected().Verify(
                "SendAsync",
                Times.Once(),
                ItExpr.Is<HttpRequestMessage>(req =>
                    req.Headers.GetValues("X-Token").Contains(realToken)),
                ItExpr.IsAny<CancellationToken>()
            );
        }

        [Fact]
        public async Task CreateInvoiceAsync_WhenApiReturnsErrorStatusCode_ShouldFallbackToMockSuccessRedirect()
        {
            // Arrange
            var orderId = Guid.NewGuid();
            _configMock.Setup(c => c["Monobank:Token"]).Returns("uSomeConfiguredToken");
            _configMock.Setup(c => c["Monobank:RedirectUrl"]).Returns("https://aquapass.ua/booking");

            // Симулюємо помилку API (наприклад, 403 Forbidden або 400 Bad Request)
            _httpMessageHandlerMock.Protected()
                .Setup<Task<HttpResponseMessage>>(
                    "SendAsync",
                    ItExpr.IsAny<HttpRequestMessage>(),
                    ItExpr.IsAny<CancellationToken>()
                )
                .ReturnsAsync(new HttpResponseMessage
                {
                    StatusCode = HttpStatusCode.Forbidden,
                    Content = new StringContent("{\"errCode\":\"INVALID_TOKEN\"}")
                });

            var sut = new MonobankPaymentService(_httpClient, _configMock.Object);

            // Act
            var result = await sut.CreateInvoiceAsync(orderId, 300m, "Оплата квитка");

            // Assert
            result.Should().NotBeNull();
            result!.InvoiceId.Should().NotBeNullOrWhiteSpace();
            result.PageUrl.Should().Be($"https://aquapass.ua/booking?orderId={orderId}&payment=mock_success");
        }

        #endregion
    }
}