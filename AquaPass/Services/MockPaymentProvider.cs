using AquaPass.ModelsDto.Monobank;

namespace AquaPass.Services
{
    public class MockPaymentService : IPaymentService
    {
        private readonly ILogger<MockPaymentService> _logger;
        private readonly HttpClient _httpClient;
        private readonly IConfiguration _config;

        public MockPaymentService(HttpClient httpClient, IConfiguration config, ILogger<MockPaymentService> logger)
        {
            _httpClient = httpClient;
            _config = config;
            _logger = logger;
        }

        public Task<MonoCreateInvoiceResponse?> CreateInvoiceAsync(Guid orderId, decimal amount, string destination)
        {
            var redirectUrl = _config["Monobank:RedirectUrl"] ?? "http://localhost:3000/booking";

            _logger.LogInformation("Creating mock Monobank invoice for order {OrderId} amount {AmountCents} mode {Mode}", orderId, (int)(amount * 100), "mock");

            var response = new MonoCreateInvoiceResponse
            {
                InvoiceId = Guid.NewGuid().ToString("N"),
                // Перенаправляємо назад на сторінку успішного бронювання
                PageUrl = $"{redirectUrl}?orderId={orderId}&paid=true"
            };

            return Task.FromResult<MonoCreateInvoiceResponse?>(response);
        }
    }
}
