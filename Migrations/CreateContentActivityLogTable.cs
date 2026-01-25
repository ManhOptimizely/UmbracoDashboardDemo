using Umbraco.Cms.Infrastructure.Migrations;

namespace TestProject.Migrations
{
    /// <summary>
    /// Migration to create the ContentActivityLog table
    /// </summary>
    public class CreateContentActivityLogTable : MigrationBase
    {
        public CreateContentActivityLogTable(IMigrationContext context) : base(context)
        {
        }

        protected override void Migrate()
        {
            Logger.LogDebug("Running migration {MigrationStep}", "CreateContentActivityLogTable");

            // Check if the table already exists
            if (TableExists("ContentActivityLog") == false)
            {
                Create.Table<Models.ContentActivityLog>().Do();
                Logger.LogInformation("ContentActivityLog table created successfully");
            }
            else
            {
                Logger.LogDebug("The ContentActivityLog table already exists, skipping migration");
            }
        }
    }
}
