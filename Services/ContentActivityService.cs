using NPoco;
using TestProject.Models;
using Umbraco.Cms.Infrastructure.Persistence;
using Umbraco.Cms.Infrastructure.Scoping;

namespace TestProject.Services
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
        /// Get recent activities with optional filtering
        /// </summary>
        IEnumerable<ContentActivityLog> GetRecentActivities(int take = 50, string? action = null);

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

        public ContentActivityService(
            IScopeProvider scopeProvider,
            IActivityBroadcastService? broadcastService = null)
        {
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
                    }
                });
            }
        }

        public IEnumerable<ContentActivityLog> GetRecentActivities(int take = 50, string? action = null)
        {
            using var scope = _scopeProvider.CreateScope(autoComplete: true);
            var database = scope.Database;

            var sql = database.SqlContext.Sql()
                .Select<ContentActivityLog>()
                .From<ContentActivityLog>()
                .OrderByDescending<ContentActivityLog>(x => x.Timestamp);

            if (!string.IsNullOrWhiteSpace(action))
            {
                sql = sql.Where<ContentActivityLog>(x => x.Action == action);
            }

            // Use Skip/Take for pagination
            sql = sql.Append($"OFFSET 0 ROWS FETCH NEXT {take} ROWS ONLY");

            return database.Fetch<ContentActivityLog>(sql);
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

            return database.Fetch<ContentActivityLog>(sql);
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

            return database.Fetch<ContentActivityLog>(sql);
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

