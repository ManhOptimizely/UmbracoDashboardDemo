using System.Text.Json;
using UmbracoContentActivity.Models;
using UmbracoContentActivity.Services;
using Umbraco.Cms.Core.Events;
using Umbraco.Cms.Core.Notifications;
using Umbraco.Cms.Core.Security;
using Microsoft.AspNetCore.Http;

namespace UmbracoContentActivity.Notifications
{
    /// <summary>
    /// Notification handler for content saved events
    /// </summary>
    public class ContentSavedNotificationHandler : INotificationHandler<ContentSavedNotification>
    {
        private readonly IContentActivityService _activityService;
        private readonly IBackOfficeSecurityAccessor _backOfficeSecurityAccessor;
        private readonly IHttpContextAccessor _httpContextAccessor;

        public ContentSavedNotificationHandler(
            IContentActivityService activityService,
            IBackOfficeSecurityAccessor backOfficeSecurityAccessor,
            IHttpContextAccessor httpContextAccessor)
        {
            _activityService = activityService;
            _backOfficeSecurityAccessor = backOfficeSecurityAccessor;
            _httpContextAccessor = httpContextAccessor;
        }

        public void Handle(ContentSavedNotification notification)
        {
            var currentUser = _backOfficeSecurityAccessor.BackOfficeSecurity?.CurrentUser;
            var ipAddress = _httpContextAccessor.HttpContext?.Connection?.RemoteIpAddress?.ToString();

            foreach (var content in notification.SavedEntities)
            {
                // Check if this is a new item (created) or an update (saved)
                var isNew = content.CreateDate == content.UpdateDate;
                var action = isNew ? "Created" : "Saved";

                var activity = new ContentActivityLog
                {
                    ContentKey = content.Key,
                    ContentName = content.Name,
                    ContentTypeAlias = content.ContentType.Alias,
                    Action = action,
                    UserKey = currentUser?.Key,
                    UserName = currentUser?.Name ?? "System",
                    Timestamp = DateTime.UtcNow,
                    IsTrashed = content.Trashed,
                    IpAddress = ipAddress,
                    Metadata = JsonSerializer.Serialize(new
                    {
                        ContentId = content.Id,
                        content.Level,
                        content.Path,
                        content.SortOrder,
                        content.TemplateId
                    })
                };

                _activityService.LogActivity(activity);
            }
        }
    }

    /// <summary>
    /// Notification handler for content published events
    /// </summary>
    public class ContentPublishedNotificationHandler : INotificationHandler<ContentPublishedNotification>
    {
        private readonly IContentActivityService _activityService;
        private readonly IBackOfficeSecurityAccessor _backOfficeSecurityAccessor;
        private readonly IHttpContextAccessor _httpContextAccessor;

        public ContentPublishedNotificationHandler(
            IContentActivityService activityService,
            IBackOfficeSecurityAccessor backOfficeSecurityAccessor,
            IHttpContextAccessor httpContextAccessor)
        {
            _activityService = activityService;
            _backOfficeSecurityAccessor = backOfficeSecurityAccessor;
            _httpContextAccessor = httpContextAccessor;
        }

        public void Handle(ContentPublishedNotification notification)
        {
            var currentUser = _backOfficeSecurityAccessor.BackOfficeSecurity?.CurrentUser;
            var ipAddress = _httpContextAccessor.HttpContext?.Connection?.RemoteIpAddress?.ToString();

            foreach (var content in notification.PublishedEntities)
            {
                // Log for each culture if multi-language
                var publishedCultures = content.AvailableCultures.ToList();
                
                if (publishedCultures.Any())
                {
                    foreach (var culture in publishedCultures)
                    {
                        var activity = new ContentActivityLog
                        {
                            ContentKey = content.Key,
                            ContentName = content.GetCultureName(culture) ?? content.Name,
                            ContentTypeAlias = content.ContentType.Alias,
                            Action = "Published",
                            UserKey = currentUser?.Key,
                            UserName = currentUser?.Name ?? "System",
                            Timestamp = DateTime.UtcNow,
                            Culture = culture,
                            IsTrashed = content.Trashed,
                            IpAddress = ipAddress,
                            Metadata = JsonSerializer.Serialize(new
                            {
                                ContentId = content.Id,
                                content.PublishDate,
                                content.Level
                            })
                        };

                        _activityService.LogActivity(activity);
                    }
                }
                else
                {
                    // Invariant culture
                    var activity = new ContentActivityLog
                    {
                        ContentKey = content.Key,
                        ContentName = content.Name,
                        ContentTypeAlias = content.ContentType.Alias,
                        Action = "Published",
                        UserKey = currentUser?.Key,
                        UserName = currentUser?.Name ?? "System",
                        Timestamp = DateTime.UtcNow,
                        IsTrashed = content.Trashed,
                        IpAddress = ipAddress,
                        Metadata = JsonSerializer.Serialize(new
                        {
                            ContentId = content.Id,
                            content.PublishDate,
                            content.Level
                        })
                    };

                    _activityService.LogActivity(activity);
                }
            }
        }
    }

    /// <summary>
    /// Notification handler for content unpublished events
    /// </summary>
    public class ContentUnpublishedNotificationHandler : INotificationHandler<ContentUnpublishedNotification>
    {
        private readonly IContentActivityService _activityService;
        private readonly IBackOfficeSecurityAccessor _backOfficeSecurityAccessor;
        private readonly IHttpContextAccessor _httpContextAccessor;

        public ContentUnpublishedNotificationHandler(
            IContentActivityService activityService,
            IBackOfficeSecurityAccessor backOfficeSecurityAccessor,
            IHttpContextAccessor httpContextAccessor)
        {
            _activityService = activityService;
            _backOfficeSecurityAccessor = backOfficeSecurityAccessor;
            _httpContextAccessor = httpContextAccessor;
        }

        public void Handle(ContentUnpublishedNotification notification)
        {
            var currentUser = _backOfficeSecurityAccessor.BackOfficeSecurity?.CurrentUser;
            var ipAddress = _httpContextAccessor.HttpContext?.Connection?.RemoteIpAddress?.ToString();

            foreach (var content in notification.UnpublishedEntities)
            {
                var activity = new ContentActivityLog
                {
                    ContentKey = content.Key,
                    ContentName = content.Name,
                    ContentTypeAlias = content.ContentType.Alias,
                    Action = "Unpublished",
                    UserKey = currentUser?.Key,
                    UserName = currentUser?.Name ?? "System",
                    Timestamp = DateTime.UtcNow,
                    IsTrashed = content.Trashed,
                    IpAddress = ipAddress,
                    Metadata = JsonSerializer.Serialize(new
                    {
                        ContentId = content.Id,
                        Level = content.Level
                    })
                };

                _activityService.LogActivity(activity);
            }
        }
    }

    /// <summary>
    /// Notification handler for content moved to recycle bin
    /// </summary>
    public class ContentMovedToRecycleBinNotificationHandler : INotificationHandler<ContentMovedToRecycleBinNotification>
    {
        private readonly IContentActivityService _activityService;
        private readonly IBackOfficeSecurityAccessor _backOfficeSecurityAccessor;
        private readonly IHttpContextAccessor _httpContextAccessor;

        public ContentMovedToRecycleBinNotificationHandler(
            IContentActivityService activityService,
            IBackOfficeSecurityAccessor backOfficeSecurityAccessor,
            IHttpContextAccessor httpContextAccessor)
        {
            _activityService = activityService;
            _backOfficeSecurityAccessor = backOfficeSecurityAccessor;
            _httpContextAccessor = httpContextAccessor;
        }

        public void Handle(ContentMovedToRecycleBinNotification notification)
        {
            var currentUser = _backOfficeSecurityAccessor.BackOfficeSecurity?.CurrentUser;
            var ipAddress = _httpContextAccessor.HttpContext?.Connection?.RemoteIpAddress?.ToString();

            foreach (var item in notification.MoveInfoCollection)
            {
                var content = item.Entity;
                
                var activity = new ContentActivityLog
                {
                    ContentKey = content.Key,
                    ContentName = content.Name,
                    ContentTypeAlias = content.ContentType.Alias,
                    Action = "Trashed",
                    UserKey = currentUser?.Key,
                    UserName = currentUser?.Name ?? "System",
                    Timestamp = DateTime.UtcNow,
                    IsTrashed = true,
                    IpAddress = ipAddress,
                    Metadata = JsonSerializer.Serialize(new
                    {
                        ContentId = content.Id,
                        OriginalPath = item.OriginalPath
                    })
                };

                _activityService.LogActivity(activity);
            }
        }
    }
}
