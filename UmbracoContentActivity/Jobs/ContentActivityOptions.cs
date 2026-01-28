namespace UmbracoContentActivity.Jobs
{
    /// <summary>
    /// Configuration options for Content Activity Tracker
    /// Binds to Umbraco:CMS:ContentActivity section in appsettings.json
    /// </summary>
    public class ContentActivityOptions
    {
        /// <summary>
        /// Configuration section name
        /// </summary>
        public const string SectionName = "Umbraco:CMS:ContentActivity";

        /// <summary>
        /// Gets or sets the number of days to retain activity data before deletion.
        /// Default: 90 days
        /// </summary>
        public int DaysToKeep { get; set; } = 90;

        /// <summary>
        /// Gets or sets the period in days between cleanup job executions.
        /// Default: 1 day (runs daily)
        /// Use this for day-based periods (e.g., 1, 7, 30)
        /// </summary>
        public int PeriodInDays { get; set; } = 1;

        /// <summary>
        /// Gets or sets the period in hours between cleanup job executions.
        /// Default: 0 hours (not used if 0)
        /// Use this for hour-based periods (e.g., 6, 12, 24)
        /// </summary>
        public int PeriodInHours { get; set; } = 0;

        /// <summary>
        /// Gets or sets the period in minutes between cleanup job executions.
        /// Default: 0 minutes (not used if 0)
        /// Use this for minute-based periods (e.g., 30, 60, 120)
        /// </summary>
        public int PeriodInMinutes { get; set; } = 0;

        /// <summary>
        /// Gets or sets the period in seconds between cleanup job executions.
        /// Default: 0 seconds (not used if 0)
        /// Use this for second-based periods (e.g., 30, 60, 300)
        /// Useful for testing and development
        /// </summary>
        public int PeriodInSeconds { get; set; } = 0;

        /// <summary>
        /// Gets or sets the delay in minutes before the first execution of the cleanup job after startup.
        /// Default: 5 minutes
        /// </summary>
        public int DelayInMinutes { get; set; } = 5;

        /// <summary>
        /// Gets or sets whether the cleanup job is enabled.
        /// Default: true
        /// </summary>
        public bool EnableCleanupJob { get; set; } = true;

        /// <summary>
        /// Gets the total period as a TimeSpan.
        /// Priority order: Seconds > Minutes > Hours > Days
        /// Only the most granular non-zero value is used.
        /// </summary>
        public TimeSpan GetPeriod()
        {
            // Use the most granular (smallest unit) non-zero value
            if (PeriodInSeconds > 0)
            {
                return TimeSpan.FromSeconds(PeriodInSeconds);
            }
            
            if (PeriodInMinutes > 0)
            {
                return TimeSpan.FromMinutes(PeriodInMinutes);
            }
            
            if (PeriodInHours > 0)
            {
                return TimeSpan.FromHours(PeriodInHours);
            }
            
            // Default to days (must be at least 1 to prevent infinite loop)
            return TimeSpan.FromDays(Math.Max(PeriodInDays, 1));
        }

        /// <summary>
        /// Gets the delay before first execution as a TimeSpan.
        /// </summary>
        public TimeSpan GetDelay()
        {
            return TimeSpan.FromMinutes(DelayInMinutes);
        }
    }
}


