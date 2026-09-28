using System.Threading.Tasks;

namespace AquaPass.Services
{
    // Simple no-op implementation used for tests and legacy direct instantiation.
    public class NoopSunbedHoldService : ISunbedHoldService
    {
        public Task<bool> HoldSunbedAsync(Guid sunbedId, DateTime visitDate, string holdToken, TimeSpan duration)
        {
            return Task.FromResult(false);
        }

        public Task ReleaseHoldAsync(Guid sunbedId, DateTime visitDate, string holdToken)
        {
            return Task.CompletedTask;
        }

        public Task<HashSet<Guid>> GetHeldSunbedIdsAsync(DateTime visitDate, string? currentHoldToken = null)
        {
            return Task.FromResult(new HashSet<Guid>());
        }
    }
}
