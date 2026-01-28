using NPoco;
using UmbracoContentActivity.Models;
using Umbraco.Cms.Infrastructure.Persistence;
using Umbraco.Cms.Infrastructure.Scoping;
using Microsoft.Extensions.Logging;

namespace UmbracoContentActivity.Services
{
    /// <summary>
    /// Service for managing content activity logs in the database
    /// </summary>
    public interface IContentActivityService
    {
        /// <summary>
        /// Log a content activity event
        /// </summary>
        void LogActivity(ContentActivityLog activity);

        /// <summary>
        /// Get recent activities with server-side filtering, searching, sorting, and pagination
        /// </summary>
        (IEnumerable<ContentActivityLog> activities, int totalCount) GetRecentActivities(
            int take = 10, 
            int skip = 0, 
            string? action = null, 
            string? search = null, 
            string sortOrder = "newest");

        /// <summary>
        /// Get activities by content key
        /// </summary>
        IEnumerable<ContentActivityLog> GetActivitiesByContent(Guid contentKey);

        /// <summary>
        /// Get activities by user
        /// </summary>
        IEnumerable<ContentActivityLog> GetActivitiesByUser(Guid userKey);

        /// <summary>
        /// Get activity statistics
        /// </summary>
        ContentActivityStats GetStatistics(DateTime? since = null);

        /// <summary>
        /// Delete old activities (cleanup)
        /// </summary>
        int DeleteOldActivities(int daysToKeep = 90);
    }

    public class ContentActivityService : IContentActivityService
    {
        private readonly IScopeProvider _scopeProvider;
        private readonly IActivityBroadcastService? _broadcastService;
        private readonly ILogger<ContentActivityService> _logger;
        public ContentActivityService(
            ILogger<ContentActivityService> logger,
            IScopeProvider scopeProvider,
            IActivityBroadcastService? broadcastService = null)
        {
            _logger = logger;
            _scopeProvider = scopeProvider;
            _broadcastService = broadcastService;
        }

        public void LogActivity(ContentActivityLog activity)
        {
            using var scope = _scopeProvider.CreateScope();
            var database = scope.Database;
            
            database.Insert(activity);
            
            scope.Complete();

            // Broadcast to SignalR clients (fire and forget)
            if (_broadcastService != null)
            {
                _ = Task.Run(async () => 
                {
                    try
                    {
                        await _broadcastService.BroadcastActivityAsync(activity);
                    }
                    catch (Exception)
                    {
                        // Log error but don't fail the operation
                        _logger.LogError("Failed to broadcast activity");
                    }
                });
            }
        }

        public (IEnumerable<ContentActivityLog> activities, int totalCount) GetRecentActivities(
            int take = 10,
            int skip = 0,
            string? action = null,
            string? search = null,
            string sortOrder = "newest")
        {
            using var scope = _scopeProvider.CreateScope(autoComplete: true);
            var database = scope.Database;

            // Build the base query for activities
            var sql = database.SqlContext.Sql()
                .Select<ContentActivityLog>()
                .From<ContentActivityLog>();

            // Build count query
            var countSql = database.SqlContext.Sql()
                .Select("COUNT(*)")
                .From<ContentActivityLog>();

            // Apply action filter
            if (!string.IsNullOrWhiteSpace(action))
            {
                sql = sql.Where<ContentActivityLog>(x => x.Action == action);
                countSql = countSql.Where<ContentActivityLog>(x => x.Action == action);
            }

            // Apply search filter
            if (!string.IsNullOrWhiteSpace(search))
            {
                var searchTerm = $"%{search}%";
                sql = sql.Where($"(ContentName LIKE @0 OR UserName LIKE @0 OR ContentTypeAlias LIKE @0)", searchTerm);
                countSql = countSql.Where($"(ContentName LIKE @0 OR UserName LIKE @0 OR ContentTypeAlias LIKE @0)", searchTerm);
            }

            // Get total count
            var totalCount = database.ExecuteScalar<int>(countSql);

            // Apply sorting
            if (sortOrder?.ToLower() == "oldest")
            {
                sql = sql.OrderBy<ContentActivityLog>(x => x.Timestamp);
            }
            else
            {
                sql = sql.OrderByDescending<ContentActivityLog>(x => x.Timestamp);
            }

            // Apply pagination
            sql = sql.Append($"OFFSET {skip} ROWS FETCH NEXT {take} ROWS ONLY");

            var activities = database.Fetch<ContentActivityLog>(sql);
            scope.Complete();

            return (activities, totalCount);
        }

        public IEnumerable<ContentActivityLog> GetActivitiesByContent(Guid contentKey)
        {
            using var scope = _scopeProvider.CreateScope(autoComplete: true);
            var database = scope.Database;

            var sql = database.SqlContext.Sql()
                .Select<ContentActivityLog>()
                .From<ContentActivityLog>()
                .Where<ContentActivityLog>(x => x.ContentKey == contentKey)
                .OrderByDescending<ContentActivityLog>(x => x.Timestamp);

            var queryResults = database.Fetch<ContentActivityLog>(sql);
            scope.Complete();
            return queryResults;
        }

        public IEnumerable<ContentActivityLog> GetActivitiesByUser(Guid userKey)
        {
            using var scope = _scopeProvider.CreateScope(autoComplete: true);
            var database = scope.Database;

            var sql = database.SqlContext.Sql()
                .Select<ContentActivityLog>()
                .From<ContentActivityLog>()
                .Where<ContentActivityLog>(x => x.UserKey == userKey)
                .OrderByDescending<ContentActivityLog>(x => x.Timestamp);

            var queryResults = database.Fetch<ContentActivityLog>(sql);
            scope.Complete();
            return queryResults;
        }

        public ContentActivityStats GetStatistics(DateTime? since = null)
        {
            using var scope = _scopeProvider.CreateScope(autoComplete: true);
            var database = scope.Database;

            var sql = database.SqlContext.Sql()
                .Select("Action, COUNT(*) as Count")
                .From<ContentActivityLog>()
                .GroupBy("Action");

            if (since.HasValue)
            {
                sql = sql.Where<ContentActivityLog>(x => x.Timestamp >= since.Value);
            }

            var results = database.Fetch<dynamic>(sql);

            var stats = new ContentActivityStats
            {
                TotalActivities = results.Sum(r => (int)r.Count)
            };

            foreach (var result in results)
            {
                var action = (string)result.Action;
                var count = (int)result.Count;

                switch (action.ToLower())
                {
                    case "created":
                        stats.CreatedCount = count;
                        break;
                    case "published":
                        stats.PublishedCount = count;
                        break;
                    case "unpublished":
                        stats.UnpublishedCount = count;
                        break;
                    case "saved":
                        stats.SavedCount = count;
                        break;
                }
            }
            scope.Complete();
            return stats;
        }

        public int DeleteOldActivities(int daysToKeep = 90)
        {
            using var scope = _scopeProvider.CreateScope();
            var database = scope.Database;

            var cutoffDate = DateTime.UtcNow.AddDays(-daysToKeep);

            var deleted = database.Execute(
                "DELETE FROM ContentActivityLog WHERE Timestamp < @0",
                cutoffDate);

            scope.Complete();

            return deleted;
        }
    }

    /// <summary>
    /// Statistics for content activities
    /// </summary>
    public class ContentActivityStats
    {
        public int TotalActivities { get; set; }
        public int CreatedCount { get; set; }
        public int PublishedCount { get; set; }
        public int UnpublishedCount { get; set; }
        public int SavedCount { get; set; }
    }
}

