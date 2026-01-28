# Content Activity Tracker Dashboard 

A custom backoffice dashboard for Umbraco 17 CMS that displays recent content activity and allows administrators to monitor content changes across the system.

### Overview
The Content Activity Tracker uses a database table to persistently store all content activity events. This provides a complete audit trail and enables historical reporting.

## Database Setup
### Automatic Database Setup
The database table is created automatically in the first run the application using Umbraco's migration system. No manual database setup is required!

**What happens on first run:**
1. The migration system detects the Content Activity Tracker migration plan
2. Creates the `ContentActivityLog` table in Umbraco database
3. Adds necessary indexes for optimal query performance
4. Starts capturing content events automatically

### Database Configuration

The system uses the existing Umbraco local database configured in `appsettings.json`. Change the connection string as needed:

```json
{
  "ConnectionStrings": {
    "umbracoDbDSN": "Data Source=(localdb)\\MSSQLLocalDB;AttachDbFilename=|DataDirectory|\\Umbraco.mdf;Integrated Security=True"
  }
}
```

### Running Locally - Quick Start

**Prerequisites:**
- .NET 10 SDK installed
- Visual Studio
- Umbraco CMS database connection configured

**Steps:**

1. **Clone/open the project**

2. **Verify connection string** in `appsettings.json`:
   ```json
   {
     "ConnectionStrings": {
       "umbracoDbDSN": "Data Source=(localdb)\\MSSQLLocalDB;AttachDbFilename=|DataDirectory|\\Umbraco.mdf;Integrated Security=True"
     }
   }
   ```

3. **Build and run**:
   ```
   dotnet build
   dotnet run
   ```

   Or press **F5** in Visual Studio.

4. **Dashboard view**:
   - Navigate to `https://localhost:44338/umbraco`
   - Complete the installation wizard (if first run)
   - Login to the backoffice
   - Navigate to the "Content Activity" dashboard.

### Cleanup Old Activities

The system schedules a cleanup job to delete old activities. All you need is to configure the retention period, job execution interval, and other settings as needed.
The config section must under "Umbraco:CMS" path.
- EnableCleanupJob: Enable or disable the cleanup job. Useful for multi-instances systems.
- DaysToKeep: Number of days to retain activities (default: last 90 days)
- DelayInMinutes: Delay before the first execution of the cleanup job (in minutes - default: 5)
- PeriodInDays: How often to run the cleanup job (in days)
- PeriodInHours: How often to run the cleanup job (in hours)
- PeriodInMinutes: How often to run the cleanup job (in minutes)
- PeriodInSeconds: How often to run the cleanup job (in seconds) - recommended for testing/local development
**Configuration Example in `appsettings.json`:**
```json
{
  "Umbraco": {
    "CMS": {
      "ContentActivity": {
        "DaysToKeep": 30,
        "PeriodInDays": 1,
        "DelayInMinutes": 5,
        "EnableCleanupJob": true
      }
    }
  } 
}
```

### API Endpoints (Umbraco Management API)

The following API endpoints retrieve data from the database:

- `GET /umbraco/management/api/v1/content-activity?{params}` - Get recent activities with optional filtering and pagination.
- Verify the API endpoint in Swagger UI at `https://localhost:44338/umbraco/swagger/index.html?urls.primaryName=Umbraco+Management+API`
Then filter for "My custom Backoffice API" tag.

**Example:**
```bash
curl -X GET "https://localhost:44338/umbraco/management/api/v1/content-activity?skip=0&take=10&action=Published" \
  -H "Authorization: Bearer YOUR_UMBRACO_AUTH_TOKEN"
```
### Dashboard features & security
#### 🔍 Advanced Filtering & Search
- Filter by action type: All, Created, Published, Saved, Unpublished
- Search functionality: Search by content name, user name, or content type
- Sort options: Newest first or oldest first

#### 🔒 Security
- Authentication required: Only authenticated backoffice users can view
- Error handling for unauthorized access

### Build Nuget Package
####This project includes a PowerShell script to create a NuGet package for distribution.
- Run the following shell command in the "Scripts" directory:
  ```
  powershell .\pack-nuget.ps1 -OutputPath "YOUR_OUTPUT_PATH"
  ```

### Import this package into your Umbraco project:
1. Install the NuGet package.
2. Register the SignalR hub endpoint in `Startup.cs` for the Dashboard using `MapContentActivityHub()` extension method.
```c#
using UmbracoContentActivity.Extensions;
builder.CreateUmbracoBuilder()
    .AddBackOffice()
    .AddWebsite()
    .AddComposers() <-- This will register the necessary services and components for Content Activity Tracker
    .Build();

app.UseUmbraco()
    .WithMiddleware(/*Register your middleware*/)
    .WithEndpoints(endpoints =>
        // Register the SignalR hub endpoint for Content Activity Dashboard
        endpoints.MapContentActivityHub();
    );
```
### TODO list
- [ ] Add unit tests for API controllers and services (I'm facing a conflict with .NET version between Umbraco 17 vs Unit test framework)
- [ ] Use Procedures, caching for activity operations

## License

This dashboard is part of Umbraco installation and follows the same licensing terms as Umbraco CMS.