using UmbracoContentActivity.Jobs;
using UmbracoContentActivity.Notifications;
using UmbracoContentActivity.Services;
using Umbraco.Cms.Core.Composing;
using Umbraco.Cms.Core.Notifications;
using UmbracoContentActivity.Extensions;

namespace UmbracoContentActivity.Composers
{
    /// <summary>
    /// Composer to register Content Activity Tracker services and notification handlers
    /// </summary>
    public class ContentActivityTrackerComposer : IComposer
    {
        public void Compose(IUmbracoBuilder builder)
        {
            // Register configuration options for Content Activity job
            builder.Services.AddOptions<ContentActivityOptions>()
                .Bind(builder.Config.GetSection(ContentActivityOptions.SectionName))
                .ValidateDataAnnotations();

            // Register SignalR hub
            builder.Services.AddSignalR();

            // Register the broadcast service for SignalR
            builder.Services.AddSingleton<IActivityBroadcastService, ActivityBroadcastService>();
            
            // Register the activity service
            builder.Services.AddSingleton<IContentActivityService, ContentActivityService>();

            // Register the recurring background job for cleanup
            builder.Services.AddRecurringBackgroundJob<DeleteOldActivitiesJob>();

            // Register migration notification handler
            builder.AddNotificationHandler<UmbracoApplicationStartingNotification, Migrations.RunContentActivityTrackerMigration>();

            // Register content activity notification handlers
            builder.AddNotificationHandler<ContentSavedNotification, ContentSavedNotificationHandler>();
            builder.AddNotificationHandler<ContentPublishedNotification, ContentPublishedNotificationHandler>();
            builder.AddNotificationHandler<ContentUnpublishedNotification, ContentUnpublishedNotificationHandler>();
            builder.AddNotificationHandler<ContentMovedToRecycleBinNotification, ContentMovedToRecycleBinNotificationHandler>();
        }
    }
}
