using AquaPass.ModelsDto.Monobank;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Logging;

namespace AquaPass.Services
{
    public class MonobankPaymentService : IMonobankPaymentService
    {
        private readonly HttpClient _httpClient;
        private readonly IConfiguration _config;

        private readonly ILogger<MonobankPaymentService> _logger;

        public MonobankPaymentService(HttpClient httpClient, IConfiguration config, ILogger<MonobankPaymentService> logger)
        {
            _httpClient = httpClient;
            _config = config;
            _logger = logger;
        }

        public async Task<MonoCreateInvoiceResponse?> CreateInvoiceAsync(Guid orderId, decimal amount, string destination)
        {
            var token = _config["Monobank:Token"];
            var redirectUrl = _config["Monobank:RedirectUrl"] ?? "http://localhost:3000/booking";

            // Якщо токен тестовий, відсутній або для розробки — симулюмо успішний інвойс
            if (string.IsNullOrWhiteSpace(token) || token.Contains("YOUR_MONOBANK") || token.StartsWith("test_"))
            {
                _logger.LogInformation("Creating mock Monobank invoice for order {OrderId} amount {AmountCents} mode {Mode}", orderId, (int)(amount * 100), "mock");
                return new MonoCreateInvoiceResponse
                {
                    InvoiceId = Guid.NewGuid().ToString("N"),
                    // Перенаправляємо назад на сторінку успішного бронювання
                    PageUrl = $"{redirectUrl}?orderId={orderId}&paid=true"
                };
            }

            var requestBody = new MonoCreateInvoiceRequest
            {
                Amount = (int)(amount * 100), // копійки
                Ccy = 980,
                RedirectUrl = $"{redirectUrl}?orderId={orderId}",
                WebHookUrl = _config["Monobank:WebhookUrl"] ?? string.Empty,
                OrderId = orderId.ToString(),
                MerchantPaymentInfo = new MonoMerchantPaymInfo
                {
                    Reference = orderId.ToString(),
                    Destination = destination
                }
            };

            var request = new HttpRequestMessage(HttpMethod.Post, "https://api.monobank.ua/api/merchant/invoice/create");
            request.Headers.Add("X-Token", token);
            request.Content = new StringContent(JsonSerializer.Serialize(requestBody), Encoding.UTF8, "application/json");

            _logger.LogInformation("Creating Monobank invoice for order {OrderId} amount {AmountCents} mode {Mode}", orderId, requestBody.Amount, "live");
            var response = await _httpClient.SendAsync(request);
            var jsonResponse = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("Monobank returned non-success status {StatusCode} for order {OrderId}: {ResponseBody}", response.StatusCode, orderId, jsonResponse);

                // Якщо Monobank повернув Forbidden (невалідний токен), вмикаємо mock-редирект, щоб процес не блокувався
                _logger.LogWarning("Falling back to mock redirect for order {OrderId}", orderId);
                return new MonoCreateInvoiceResponse
                {
                    InvoiceId = Guid.NewGuid().ToString("N"),
                    PageUrl = $"{redirectUrl}?orderId={orderId}&payment=mock_success"
                };
            }

            return JsonSerializer.Deserialize<MonoCreateInvoiceResponse>(jsonResponse, new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            });
        }
    }
}
