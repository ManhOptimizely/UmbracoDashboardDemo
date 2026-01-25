using Umbraco.Cms.Core;
using Umbraco.Cms.Core.Events;
using Umbraco.Cms.Core.Migrations;
using Umbraco.Cms.Core.Notifications;
using Umbraco.Cms.Core.Services;
using Umbraco.Cms.Infrastructure.Migrations;
using Umbraco.Cms.Infrastructure.Migrations.Upgrade;
using Umbraco.Cms.Infrastructure.Scoping;

namespace TestProject.Migrations
{
    /// <summary>
    /// Handles the migration plan for Content Activity Tracker
    /// </summary>
    public class ContentActivityTrackerMigrationPlan : MigrationPlan
    {
        public ContentActivityTrackerMigrationPlan() : base("ContentActivityTracker")
        {
            From(string.Empty)
                .To<CreateContentActivityLogTable>("content-activity-tracker-db-1.0.0");
        }
    }

    /// <summary>
    /// Notification handler to run migrations on application startup
    /// </summary>
    public class RunContentActivityTrackerMigration : INotificationHandler<UmbracoApplicationStartingNotification>
    {
        private readonly IMigrationPlanExecutor _migrationPlanExecutor;
        private readonly IScopeProvider _scopeProvider;
        private readonly IKeyValueService _keyValueService;
        private readonly IRuntimeState _runtimeState;

        public RunContentActivityTrackerMigration(
            IMigrationPlanExecutor migrationPlanExecutor,
            IScopeProvider scopeProvider,
            IKeyValueService keyValueService,
            IRuntimeState runtimeState)
        {
            _migrationPlanExecutor = migrationPlanExecutor;
            _scopeProvider = scopeProvider;
            _keyValueService = keyValueService;
            _runtimeState = runtimeState;
        }

        public void Handle(UmbracoApplicationStartingNotification notification)
        {
            // Only run migrations when Umbraco is running (not during install/upgrade)
            if (_runtimeState.Level < RuntimeLevel.Run)
            {
                return;
            }

            var migrationPlan = new ContentActivityTrackerMigrationPlan();
            var upgrader = new Upgrader(migrationPlan);

            using var scope = _scopeProvider.CreateScope();
            upgrader.Execute(_migrationPlanExecutor, _scopeProvider, _keyValueService);
            scope.Complete();
        }
    }
}

