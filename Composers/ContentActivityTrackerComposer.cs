using TestProject.Notifications;
using TestProject.Services;
using Umbraco.Cms.Core.Composing;
using Umbraco.Cms.Core.DependencyInjection;
using Umbraco.Cms.Core.Notifications;

namespace TestProject.Composers
{
    /// <summary>
    /// Composer to register Content Activity Tracker services and notification handlers
    /// </summary>
    public class ContentActivityTrackerComposer : IComposer
    {
        public void Compose(IUmbracoBuilder builder)
        {
            // Register the broadcast service for SignalR
            builder.Services.AddSingleton<IActivityBroadcastService, ActivityBroadcastService>();
            
            // Register the activity service
            builder.Services.AddSingleton<IContentActivityService, ContentActivityService>();

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
