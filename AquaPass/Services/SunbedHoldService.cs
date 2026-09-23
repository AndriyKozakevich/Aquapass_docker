using StackExchange.Redis;
using Microsoft.Extensions.Logging;

namespace AquaPass.Services;

public class SunbedHoldService : ISunbedHoldService
{
    private readonly IDatabase _redis;
    private readonly IServer _server;
    private readonly ILogger<SunbedHoldService> _logger;

    public SunbedHoldService(IConnectionMultiplexer redis, ILogger<SunbedHoldService> logger)
    {
        _redis = redis.GetDatabase();
        var endpoint = redis.GetEndPoints().FirstOrDefault();
        if (endpoint == null)
            throw new InvalidOperationException("No Redis endpoints available. Check your Redis configuration.");

        _server = redis.GetServer(endpoint);
        _logger = logger;
    }

    private string BuildKey(Guid sunbedId, DateTime visitDate)
    {
        var d = visitDate.ToUniversalTime().Date;
        return $"hold:sunbed:{d:yyyyMMdd}:{sunbedId}";
    }

    private string BuildSetKey(DateTime visitDate)
    {
        var d = visitDate.ToUniversalTime().Date;
        return $"hold:sunbed:set:{d:yyyyMMdd}";
    }
        

    public async Task<bool> HoldSunbedAsync(Guid sunbedId, DateTime visitDate, string holdToken, TimeSpan duration)
    {
        var key = BuildKey(sunbedId, visitDate);
        var setKey = BuildSetKey(visitDate);

        // When.NotExists гарантує атомарність (SET NX EX)
        var created = await _redis.StringSetAsync(key, holdToken, duration, When.NotExists);

        if (created)
        {
            // Add to the set of held sunbeds for that date and ensure the set has at least the same TTL
            await _redis.SetAddAsync(setKey, sunbedId.ToString());
            var currentTtl = await _redis.KeyTimeToLiveAsync(setKey);
            if (currentTtl == null || currentTtl < duration)
            {
                await _redis.KeyExpireAsync(setKey, duration);
            }
            _logger.LogInformation("Held sunbed {SunbedId} for visitDate {VisitDate} for duration {Duration} by session {SessionId}", sunbedId, visitDate, duration, holdToken);
        }

        if (!created)
        {
            _logger.LogWarning("Failed to acquire hold for sunbed {SunbedId} on {VisitDate} by session {SessionId} - already held", sunbedId, visitDate, holdToken);
        }

        return created;
    }

    public async Task ReleaseHoldAsync(Guid sunbedId, DateTime visitDate, string holdToken)
    {
        var key = BuildKey(sunbedId, visitDate);
        var setKey = BuildSetKey(visitDate);

        // Use a Lua script to atomically check owner, delete the key and remove from the set
        // Returns 1 if deleted, 0 otherwise
        const string script = @"
if redis.call('get', KEYS[1]) == ARGV[1] then
  redis.call('del', KEYS[1])
  redis.call('srem', KEYS[2], ARGV[2])
  return 1
else
  return 0
end";

        var result = await _redis.ScriptEvaluateAsync(script, new RedisKey[] { key, setKey }, new RedisValue[] { holdToken, sunbedId.ToString() });
        try
        {
            if (result.Type == ResultType.Integer && (int)result == 1)
            {
                _logger.LogInformation("Released hold for sunbed {SunbedId} on {VisitDate} by session {SessionId}", sunbedId, visitDate, holdToken);
            }
            else
            {
                _logger.LogWarning("Attempt to release hold for sunbed {SunbedId} on {VisitDate} by session {SessionId} failed (not owner or not exists)", sunbedId, visitDate, holdToken);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error while releasing hold for sunbed {SunbedId} on {VisitDate}", sunbedId, visitDate);
        }
    }

    public async Task<HashSet<Guid>> GetHeldSunbedIdsAsync(DateTime visitDate, string? currentHoldToken = null)
    {
        var heldIds = new HashSet<Guid>();
        var setKey = BuildSetKey(visitDate);

        var members = await _redis.SetMembersAsync(setKey);

        foreach (var m in members)
        {
            var idStr = m.ToString();

            // Validate GUID
            if (!Guid.TryParse(idStr, out var id))
            {
                // Cleanup invalid entry
                await _redis.SetRemoveAsync(setKey, m);
                continue;
            }

            var holdKey = BuildKey(id, visitDate);
            var exists = await _redis.KeyExistsAsync(holdKey);

            if (!exists)
            {
                // stale entry, remove from set
                await _redis.SetRemoveAsync(setKey, m);
                continue;
            }

            if (string.IsNullOrEmpty(currentHoldToken))
            {
                heldIds.Add(id);
            }
            else
            {
                var token = await _redis.StringGetAsync(holdKey);
                if (token != currentHoldToken)
                {
                    heldIds.Add(id);
                }
            }
        }

        return heldIds;
    }
}