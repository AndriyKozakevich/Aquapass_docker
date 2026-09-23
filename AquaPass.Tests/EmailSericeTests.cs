using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using AquaPass.Services;
using FluentAssertions;
using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.Extensions.Configuration;
using MimeKit;
using Moq;
using Xunit;

namespace AquaPass.Tests
{
    public class EmailServiceTests
    {
        private readonly Mock<IConfiguration> _configMock;
        private readonly Mock<ISmtpClient> _smtpMock;

        public EmailServiceTests()
        {
            _configMock = new Mock<IConfiguration>();
            _smtpMock = new Mock<ISmtpClient>();

            _configMock.Setup(c => c["EmailSettings:SenderName"]).Returns("AquaPass");
            _configMock.Setup(c => c["EmailSettings:SenderEmail"]).Returns("noreply@aquapass.ua");
            _configMock.Setup(c => c["EmailSettings:SmtpServer"]).Returns("smtp.gmail.com");
            _configMock.Setup(c => c["EmailSettings:Port"]).Returns("587");
            _configMock.Setup(c => c["EmailSettings:Username"]).Returns("aquapass.test@gmail.com");
            _configMock.Setup(c => c["EmailSettings:Password"]).Returns("secretpassword");
        }

        [Fact]
        public async Task SendOrderConfirmationAsync_WhenCalled_ShouldConnectAuthenticateSendAndDisconnect()
        {
            // Arrange
            var sut = new EmailService(_configMock.Object, _smtpMock.Object);
            var fakePdfBytes = new byte[] { 0x25, 0x50, 0x44, 0x46 }; // %PDF
            const string orderNumber = "ORD-7788";
            const string clientEmail = "taras@example.com";
            const string clientName = "Тарас Чубай";

            // Act
            await sut.SendOrderConfirmationAsync(clientEmail, clientName, orderNumber, fakePdfBytes);

            // Assert
            // 1. Перевірка підключення до сервера
            _smtpMock.Verify(c => c.ConnectAsync("smtp.gmail.com", 587, SecureSocketOptions.StartTls, It.IsAny<CancellationToken>()), Times.Once);

            // 2. Перевірка автентифікації
            _smtpMock.Verify(c => c.AuthenticateAsync("aquapass.test@gmail.com", "secretpassword", It.IsAny<CancellationToken>()), Times.Once);

            // 3. Перевірка параметрів відправленого повідомлення (MimeMessage)
            _smtpMock.Verify(c => c.SendAsync(It.Is<MimeMessage>(msg =>
                msg.To.Mailboxes.Any(m => m.Address == clientEmail && m.Name == clientName) &&
                msg.From.Mailboxes.Any(m => m.Address == "noreply@aquapass.ua") &&
                msg.Subject.Contains(orderNumber) &&
                msg.Attachments.Any(a => a.ContentType.Name == $"AquaPass_Order_{orderNumber}.pdf")
            ), It.IsAny<CancellationToken>(), null), Times.Once);

            // 4. Перевірка закриття з'єднання
            _smtpMock.Verify(c => c.DisconnectAsync(true, It.IsAny<CancellationToken>()), Times.Once);
        }
    }
}