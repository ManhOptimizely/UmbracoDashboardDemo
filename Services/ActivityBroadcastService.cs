using Microsoft.AspNetCore.SignalR;
using UmbracoContentActivity.Hubs;
using UmbracoContentActivity.Models;

namespace UmbracoContentActivity.Services
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
                Color = GetColorForAction(activity.Action)
            };

            await _hubContext.Clients.All.SendAsync("ReceiveActivity", activityDto);
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
                Color = GetColorForAction(activity.Action)
            };

            await _hubContext.Clients.Group($"content_{contentKey}")
                .SendAsync("ReceiveActivity", activityDto);
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
