using Microsoft.AspNetCore.SignalR;

namespace AquaPass.Hubs
{
    public class SunbedHub : Hub
    {
        public async Task JoinDateGroup(string visitDate)
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, visitDate);
        }

        public async Task LeaveDateGroup(string visitDate)
        {
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, visitDate);
        }
    }
}