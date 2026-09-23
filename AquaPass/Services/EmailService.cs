using MimeKit;
using MailKit.Net.Smtp;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace AquaPass.Services
{
    public class EmailService : IEmailService
    {
        private readonly IConfiguration _config;
        private readonly ISmtpClient? _injectedClient;
        private readonly ILogger<EmailService> _logger;

        public EmailService(IConfiguration config, ILogger<EmailService> logger) : this(config, null, logger)
        {
        }

        public EmailService(IConfiguration config, ISmtpClient? smtpClient, ILogger<EmailService> logger)
        {
            _config = config;
            _injectedClient = smtpClient;
            _logger = logger;
        }

        public async Task SendOrderConfirmationAsync(string toEmail, string customerName, string orderNumber, byte[] pdfBytes)
        {
            var message = new MimeMessage();
            message.From.Add(new MailboxAddress(
                _config["EmailSettings:SenderName"] ?? "AquaPass",
                _config["EmailSettings:SenderEmail"] ?? "noreply@aquapass.ua"
            ));
            message.To.Add(new MailboxAddress(customerName, toEmail));
            message.Subject = $"Ваші квитки в AquaPass — Замовлення #{orderNumber}";

            var bodyBuilder = new BodyBuilder
            {
                HtmlBody = $@"
                <div style='font-family: Arial, sans-serif; color: #1e293b; max-width: 600px;'>
                    <h2 style='color: #0284c7;'>Вітаємо, {customerName}!</h2>
                    <p>Ваше замовлення <b>#{orderNumber}</b> успішно підтверджено та оплачено.</p>
                    <p>Електронні квитки з QR-кодами для проходу через турнікет прикріплені до цього листа у форматі PDF.</p>
                    <hr style='border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;'/>
                    <p style='font-size: 12px; color: #64748b;'>Збережіть цей файл або відкрийте його на вході до комплексу.</p>
                </div>"
            };

            bodyBuilder.Attachments.Add($"AquaPass_Order_{orderNumber}.pdf", pdfBytes, new ContentType("application", "pdf"));
            message.Body = bodyBuilder.ToMessageBody();

            var client = _injectedClient ?? new SmtpClient();
            try
            {
                await client.ConnectAsync(
                    _config["EmailSettings:SmtpServer"] ?? "localhost",
                    int.Parse(_config["EmailSettings:Port"] ?? "587"),
                    MailKit.Security.SecureSocketOptions.StartTls
                );

                await client.AuthenticateAsync(
                    _config["EmailSettings:Username"] ?? "user",
                    _config["EmailSettings:Password"] ?? "pass"
                );

                await client.SendAsync(message);
                await client.DisconnectAsync(true);

                _logger.LogInformation("Email with order {OrderNumber} sent successfully to {Recipient}", orderNumber, toEmail);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to send email for order {OrderNumber} to {Recipient}", orderNumber, toEmail);
                throw;
            }
            finally
            {
                if (_injectedClient == null)
                {
                    client.Dispose();
                }
            }
        }
    }
}