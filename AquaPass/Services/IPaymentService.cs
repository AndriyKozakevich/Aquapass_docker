using AquaPass.ModelsDto.Monobank;

namespace AquaPass.Services
{
    public interface IPaymentService
    {
        Task<MonoCreateInvoiceResponse?> CreateInvoiceAsync(Guid orderId, decimal amount, string destination);
    }
}