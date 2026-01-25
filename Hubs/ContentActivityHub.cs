using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using TestProject.Models;
using Umbraco.Cms.Web.Common.Authorization;

namespace TestProject.Hubs
{
    /// <summary>
    /// SignalR Hub for broadcasting real-time content activity updates
    /// </summary>
    //[Authorize(Policy = AuthorizationPolicies.BackOfficeAccess)]
    public class ContentActivityHub : Hub
    {
        /// <summary>
        /// Send activity update to all connected clients
        /// </summary>
        public async Task BroadcastActivity(ContentActivityLog activity)
        {
            await Clients.All.SendAsync("ReceiveActivity", activity);
        }

        /// <summary>
        /// Send activity update to all clients except the sender
        /// </summary>
        public async Task BroadcastActivityToOthers(ContentActivityLog activity)
        {
            await Clients.Others.SendAsync("ReceiveActivity", activity);
        }

        /// <summary>
        /// Send statistics update to all connected clients
        /// </summary>
        public async Task BroadcastStatistics(object statistics)
        {
            await Clients.All.SendAsync("ReceiveStatistics", statistics);
        }

        /// <summary>
        /// Join a specific content activity room (for filtering by content)
        /// </summary>
        public async Task JoinContentRoom(string contentKey)
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, $"content_{contentKey}");
        }

        /// <summary>
        /// Leave a specific content activity room
        /// </summary>
        public async Task LeaveContentRoom(string contentKey)
        {
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"content_{contentKey}");
        }

        /// <summary>
        /// Client connection lifecycle events
        /// </summary>
        public override async Task OnConnectedAsync()
        {
            await base.OnConnectedAsync();
            // Optionally log connection
        }

        public override async Task OnDisconnectedAsync(Exception? exception)
        {
            await base.OnDisconnectedAsync(exception);
            // Optionally log disconnection
        }
    }
}
