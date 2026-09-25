namespace AquaPass.ModelsDto.Monobank
{
    public class MonoCreateInvoiceRequest
    {
        public int Amount { get; set; }
        public int Ccy { get; set; } = 980; // 980 — code UAH (ISO 4217)
        public string RedirectUrl { get; set; } = string.Empty;
        public string WebHookUrl { get; set; } = string.Empty;
        public string OrderId { get; set; } = string.Empty;
        public MonoMerchantPaymInfo? MerchantPaymentInfo { get; set; }
    }
}