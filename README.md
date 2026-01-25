# Content Activity Tracker Dashboard

A custom backoffice dashboard for Umbraco 17 CMS that displays recent content activity and allows administrators to monitor content changes across the system.

## Database Setup

### Overview
The Content Activity Tracker uses a database table to persistently store all content activity events. This provides a complete audit trail and enables historical reporting.

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
    "umbracoDbDSN": "Server=.;Database=UmbracoDb;Integrated Security=true;TrustServerCertificate=true"
  }
}
```

### Running Locally - Quick Start

**Prerequisites:**
- .NET 10 SDK installed
- Visual Studio 2022 (or VS Code)
- SQL Server LocalDB (included with Visual Studio) OR SQL Server Express

**Steps:**

1. **Clone/open the project**

2. **Verify connection string** in `appsettings.json`:
   ```json
   {
     "ConnectionStrings": {
       "umbracoDbDSN": "Server=(localdb)\\MSSQLLocalDB;Database=UmbracoContentTracker;Integrated Security=true;TrustServerCertificate=true"
     }
   }
   ```

3. **Build and run**:
   ```
   dotnet build
   dotnet run
   ```

   Or press **F5** in Visual Studio.

4. **Complete Umbraco installation**:
   - Navigate to `https://localhost:[PORT]/umbraco`
   - Complete the installation wizard
   - Create an admin account
   - The database and ContentActivityLog table will be created automatically

### Database Maintenance

#### Cleanup Old Activities

The system scheduled a cleanup job to delete old activities:

```csharp
// Delete activities older than 90 days
var deleted = _contentActivityService.DeleteOldActivities(daysToKeep: 90);
```

### API Endpoints for Database Access

The following API endpoints retrieve data from the database:

- `GET /umbraco/management/api/v1/content-activity` - Get recent activities
- `GET /umbraco/management/api/v1/content-activity/by-content/{contentKey}` - Activities by content
- `GET /umbraco/management/api/v1/content-activity/by-user/{userKey}` - Activities by user
- `GET /umbraco/management/api/v1/content-activity/statistics` - Activity statistics

**Example:**
```bash
curl -X GET "https://localhost:44342/umbraco/management/api/v1/content-activity?take=10&action=Published" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Troubleshooting Performance issues

**Problem**: Performance issues with large activity tables
- **Solution**:
  - Run cleanup to delete old activities
  - Add additional indexes if needed
  - Consider partitioning for very large tables (100k+ rows)

## Features

### 🕒 Activity Monitoring
- **Real-time tracking** of content changes including:
  - Content creation
  - Content publishing
  - Content saves/updates
  - Content unpublishing
- **User information** showing who performed each action
- **Timestamp tracking** with human-readable relative time (e.g., "5 minutes ago")

### 📊 Statistics Dashboard
- Quick overview cards showing:
  - Total activities count
  - Number of created items
  - Number of published items
  - Number of saved items
- Interactive stat cards that highlight when filtered

### 🔍 Advanced Filtering & Search
- **Filter by action type**: All, Created, Published, Saved, Unpublished
- **Search functionality**: Search by content name, user name, or content type
- **Sort options**: Newest first or oldest first
- **Real-time updates**: Results update instantly as you type

### 🔒 Security
- **Authentication required**: Only authenticated backoffice users can view
- Validates user authentication on load
- Error handling for unauthorized access

### 🔍 Filtering Activities
- Use the **Filter by Action** dropdown to show specific types of activities
- Use the **Search** box to find specific content, users, or content types
- Use the **Sort Order** dropdown to change the order of results

## License

This dashboard is part of Umbraco installation and follows the same licensing terms as Umbraco CMS.
