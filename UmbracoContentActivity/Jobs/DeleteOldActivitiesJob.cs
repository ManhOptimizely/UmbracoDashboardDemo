using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Umbraco.Cms.Core;
using Umbraco.Cms.Infrastructure.BackgroundJobs;
using UmbracoContentActivity.Services;

namespace UmbracoContentActivity.Jobs
{
    /// <summary>
    /// Recurring background job to delete old content activity logs
    /// Runs based on configuration settings in Umbraco:CMS:ContentActivity
    /// </summary>
    public class DeleteOldActivitiesJob : IRecurringBackgroundJob
    {
        private readonly IContentActivityService _activityService;
        private readonly ILogger<DeleteOldActivitiesJob> _logger;
        private readonly ContentActivityOptions _options;

        public DeleteOldActivitiesJob(
            IContentActivityService activityService,
            ILogger<DeleteOldActivitiesJob> logger,
            IOptions<ContentActivityOptions> options)
        {
            _activityService = activityService;
            _logger = logger;
            _options = options.Value;
        }

        /// <summary>
        /// Runs based on configured period (supports days, hours, minutes, seconds)
        /// </summary>
        public TimeSpan Period => _options.GetPeriod();

        /// <summary>
        /// Delay before first execution (default: 5 minutes after startup)
        /// </summary>
        public TimeSpan Delay => _options.GetDelay();

        /// <summary>
        /// Event raised when the period changes 
        /// </summary>
        public event EventHandler? PeriodChanged { add { } remove { } }

        /// <summary>
        /// Execute the cleanup job
        /// </summary>
        public Task RunJobAsync()
        {
            return Task.Run(() =>
            {
                // Check if cleanup is enabled
                if (!_options.EnableCleanupJob)
                {
                    _logger.LogInformation("Content activity cleanup job is disabled in configuration");
                    return;
                }

                try
                {
                    _logger.LogInformation("Starting content activity cleanup job (Period: {Period})", Period);

                    var deletedCount = _activityService.DeleteOldActivities(_options.DaysToKeep);

                    if (deletedCount > 0)
                    {
                        _logger.LogInformation(
                            "Content activity cleanup completed: {DeletedCount} activities deleted (older than {DaysToKeep} days)",
                            deletedCount,
                            _options.DaysToKeep);
                    }
                    else
                    {
                        _logger.LogInformation(
                            "Content activity cleanup completed: No activities to delete (keeping last {DaysToKeep} days)",
                            _options.DaysToKeep);
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error occurred during content activity cleanup job");
                }
            });
        }
    }
}

