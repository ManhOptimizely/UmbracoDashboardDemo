using Microsoft.AspNetCore.SignalR;
using TestProject.Hubs;
using TestProject.Models;

namespace TestProject.Services
{
    /// <summary>
    /// Service for broadcasting real-time activity updates via SignalR
    /// </summary>
    public interface IActivityBroadcastService
    {
        /// <summary>
        /// Broadcast a new activity to all connected clients
        /// </summary>
        Task BroadcastActivityAsync(ContentActivityLog activity);

        /// <summary>
        /// Broadcast updated statistics to all connected clients
        /// </summary>
        Task BroadcastStatisticsAsync(ContentActivityStats statistics);

        /// <summary>
        /// Broadcast activity to a specific content room
        /// </summary>
        Task BroadcastActivityToContentRoomAsync(Guid contentKey, ContentActivityLog activity);
    }

    public class ActivityBroadcastService : IActivityBroadcastService
    {
        private readonly IHubContext<ContentActivityHub> _hubContext;

        public ActivityBroadcastService(IHubContext<ContentActivityHub> hubContext)
        {
            _hubContext = hubContext;
        }

        public async Task BroadcastActivityAsync(ContentActivityLog activity)
        {
            // Convert to DTO to avoid serialization issues
            var activityDto = new
            {
                activity.Id,
                activity.ContentKey,
                activity.ContentName,
                activity.ContentTypeAlias,
                activity.Action,
                activity.UserName,
                activity.Timestamp,
                activity.Culture,
                activity.IsTrashed,
                activity.IpAddress,
                Icon = GetIconForAction(activity.Action),
                Color = GetColorForAction(activity.Action)
            };

            await _hubContext.Clients.All.SendAsync("ReceiveActivity", activityDto);
        }

        public async Task BroadcastStatisticsAsync(ContentActivityStats statistics)
        {
            await _hubContext.Clients.All.SendAsync("ReceiveStatistics", statistics);
        }

        public async Task BroadcastActivityToContentRoomAsync(Guid contentKey, ContentActivityLog activity)
        {
            var activityDto = new
            {
                activity.Id,
                activity.ContentKey,
                activity.ContentName,
                activity.ContentTypeAlias,
                activity.Action,
                activity.UserName,
                activity.Timestamp,
                activity.Culture,
                activity.IsTrashed,
                Icon = GetIconForAction(activity.Action),
                Color = GetColorForAction(activity.Action)
            };

            await _hubContext.Clients.Group($"content_{contentKey}")
                .SendAsync("ReceiveActivity", activityDto);
        }

        private static string GetIconForAction(string action)
        {
            return action.ToLower() switch
            {
                "created" => "📄",
                "published" => "✅",
                "unpublished" => "❌",
                "saved" => "💾",
                "trashed" => "🗑️",
                _ => "📝"
            };
        }

        private static string GetColorForAction(string action)
        {
            return action.ToLower() switch
            {
                "created" => "var(--uui-color-positive)",
                "published" => "var(--uui-color-positive)",
                "unpublished" => "var(--uui-color-danger)",
                "saved" => "var(--uui-color-default)",
                "trashed" => "var(--uui-color-danger)",
                _ => "var(--uui-color-default)"
            };
        }
    }
}
