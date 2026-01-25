using Umbraco.Cms.Infrastructure.Migrations;

namespace UmbracoContentActivity.Migrations
{
    /// <summary>
    /// Migration to create the ContentActivityLog table
    /// </summary>
    public class CreateContentActivityLogTable : AsyncMigrationBase
    {
        public CreateContentActivityLogTable(IMigrationContext context) : base(context)
        {
        }
        // TODO: Consider to create Procedure for getting activities with filtering, searching, sorting, and pagination
        private void Migrate()
        {
            Logger.LogDebug("Running migration {MigrationStep}", "CreateContentActivityLogTable");

            // Check if the table already exists
            if (!TableExists("ContentActivityLog"))
            {
                Create.Table<Models.ContentActivityLog>().Do();
                Logger.LogInformation("ContentActivityLog table created successfully");
            }
            else
            {
                Logger.LogDebug("The ContentActivityLog table already exists, skipping migration");
            }
        }

        protected override Task MigrateAsync()
        {
            return Task.Run(Migrate);
        }
    }
}
