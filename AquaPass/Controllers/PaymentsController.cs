using AquaPass.Data;
using AquaPass.ModelsDto.Monobank;
using AquaPass.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using AquaPass.Extensions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using System.Text.Json;
using System.Security.Cryptography;
using System.Text;

namespace AquaPass.Controllers;

[ApiController]
[Route("api/[controller]")]
public class PaymentsController : ControllerBase
{
    private readonly IMonobankPaymentService _monobankService;
    private readonly IEmailService _emailService;
    private readonly ITicketPdfGenerator _pdfGenerator;
    private readonly AppDbContext _context;
    private readonly ILogger<PaymentsController> _logger;

    public PaymentsController(
        IMonobankPaymentService monobankService,
        IEmailService emailService,
        ITicketPdfGenerator pdfGenerator,
        AppDbContext context,
        ILogger<PaymentsController> logger
        )
    {
        _monobankService = monobankService;
        _emailService = emailService;
        _pdfGenerator = pdfGenerator;
        _context = context;
        _logger = logger;
    }

    [AllowAnonymous]
    [HttpPost("create-checkout/{orderId:guid}")]
    public async Task<IActionResult> CreateCheckout(Guid orderId)
    {
        var invalid = this.ValidateId(orderId, nameof(orderId));

        if (invalid != null)
        {
            return invalid;
        }

        var order = await _context.Orders.FindAsync(orderId);

        if (order == null)
        {
            return NotFound(new { message = "Замовлення не знайдено" });
        }

        var invoice = await _monobankService.CreateInvoiceAsync(
            order.Id,
            order.TotalAmount,
            $"Оплата замовлення №{order.OrderNumber} в AquaPass"
        );

        if (invoice == null || string.IsNullOrEmpty(invoice.PageUrl))
        {
            return BadRequest(new { message = "Не вдалося згенерувати платіж" });
        }

        return Ok(new { paymentUrl = invoice.PageUrl });
    }

    [AllowAnonymous]
    [HttpPost("mono-webhook")]
    public async Task<IActionResult> MonoWebhook(
        [FromHeader(Name = "X-Sign")] string xSign
        )
    {
        try
        {
            using var reader = new StreamReader(Request.Body);
            string rawBody = await reader.ReadToEndAsync();

            bool isValidSignature = VerifyMonobankSignature(rawBody, xSign);

            if (!isValidSignature)
            {
                return Unauthorized("Invalid signature");
            }

            var payload = JsonSerializer.Deserialize<MonoWebhookPayload>(rawBody, new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            });

            if(payload == null)
            {
                return BadRequest("Invalid payload");
            }

            if (payload.Status == "success" && Guid.TryParse(payload.Reference, out var orderId))
            {
                _logger.LogInformation("MonoWebhook received success for order {OrderId}", orderId);

                var order = await _context.Orders
                    .Include(o => o.Tickets)
                    .FirstOrDefaultAsync(o => o.Id == orderId);

                if (order != null && order.Status != "Paid")
                {
                    order.Status = "Paid";

                    foreach (var ticket in order.Tickets)
                    {
                        ticket.Status = "Active";
                    }

                    await _context.SaveChangesAsync();

                    var pdf = _pdfGenerator.GenerateOrderTicketsPdf(order);
                    await _emailService.SendOrderConfirmationAsync(
                        order.CustomerEmail,
                        $"{order.CustomerFirstName} {order.CustomerLastName}",
                        order.OrderNumber,
                        pdf
                    );

                    _logger.LogInformation("Payment processed and email sent for order {OrderId}", orderId);
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing MonoWebhook payload");
        }

        return Ok();
    }

    private bool VerifyMonobankSignature(string rawBody, string xSign)
    {
#if DEBUG
        return true;
#endif
        try
        {
            string pubKeyBase64 = Environment.GetEnvironmentVariable("MONOBANK_PUBKEY")
            ?? throw new InvalidOperationException("MONOBANK_PUBKEY is not set");

            if (string.IsNullOrEmpty(xSign))
            {
                return false;
            }

            byte[] pubKeyBytes = Convert.FromBase64String(pubKeyBase64);
            byte[] signatureBytes = Convert.FromBase64String(xSign);
            byte[] textBytes = Encoding.UTF8.GetBytes(rawBody);

            using var ecdsa = ECDsa.Create();
            ecdsa.ImportSubjectPublicKeyInfo(pubKeyBytes, out _);

            return ecdsa.VerifyData(textBytes, signatureBytes, HashAlgorithmName.SHA256);
        }
        catch(Exception ex)
        {
            _logger.LogError(ex, "Помилка криптографічної перевірки підпису Monobank");

            return false;
        }
    }

    [AllowAnonymous]
    [HttpPost("test-email")]
    public async Task<IActionResult> TestEmail([FromServices] IEmailService emailService)
    {
        try
        {
            byte[] dummyPdf = System.Text.Encoding.UTF8.GetBytes("%PDF-1.4 тестовий файл");

            await emailService.SendOrderConfirmationAsync(
                toEmail: "andriy7work@gmail.com", 
                customerName: "Андрій",
                orderNumber: "TEST-001",
                pdfBytes: dummyPdf
            );

            return Ok(new { success = true, message = "Лист успішно надіслано! Перевірте пошту (і спам)." });
        }
        catch (Exception ex)
        {
            return BadRequest(new
            {
                success = false,
                error = ex.Message,
                inner = ex.InnerException?.Message
            });
        }
    }
}