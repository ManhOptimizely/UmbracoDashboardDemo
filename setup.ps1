# Umbraco Content Activity Tracker - Database Setup Script
# This script creates the empty database for the Content Activity Tracker

param(
    [string]$DatabaseName = "Umbraco",
    [string]$DataDirectory = ".\App_Data"
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Umbraco Content Activity Tracker Setup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Function to check if SQL Server LocalDB is installed
function Test-LocalDBInstalled {
    try {
        $localDBInfo = & SqlLocalDB.exe i
        return $true
    }
    catch {
        return $false
    }
}

# Function to create LocalDB instance if not exists
function Initialize-LocalDBInstance {
    param([string]$InstanceName = "MSSQLLocalDB")
    
    Write-Host "Checking LocalDB instance '$InstanceName'..." -ForegroundColor Yellow
    
    $instances = & SqlLocalDB.exe i
    
    if ($instances -notcontains $InstanceName) {
        Write-Host "Creating LocalDB instance '$InstanceName'..." -ForegroundColor Yellow
        & SqlLocalDB.exe create $InstanceName
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "? LocalDB instance created successfully" -ForegroundColor Green
        }
        else {
            Write-Host "? Failed to create LocalDB instance" -ForegroundColor Red
            return $false
        }
    }
    else {
        Write-Host "? LocalDB instance '$InstanceName' already exists" -ForegroundColor Green
    }
    
    # Start the instance
    Write-Host "Starting LocalDB instance..." -ForegroundColor Yellow
    & SqlLocalDB.exe start $InstanceName
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "? LocalDB instance started successfully" -ForegroundColor Green
        return $true
    }
    else {
        Write-Host "? Failed to start LocalDB instance" -ForegroundColor Red
        return $false
    }
}

# Function to create database directory
function Initialize-DataDirectory {
    param([string]$Path)
    
    Write-Host "Checking data directory..." -ForegroundColor Yellow
    
    if (-not (Test-Path $Path)) {
        Write-Host "Creating data directory: $Path" -ForegroundColor Yellow
        New-Item -ItemType Directory -Path $Path -Force | Out-Null
        Write-Host "? Data directory created" -ForegroundColor Green
    }
    else {
        Write-Host "? Data directory already exists" -ForegroundColor Green
    }
    
    return (Resolve-Path $Path).Path
}

# Function to create the database
function New-UmbracoDatabase {
    param(
        [string]$DatabaseName,
        [string]$DataPath
    )
    
    $mdfPath = Join-Path $DataPath "$DatabaseName.mdf"
    $ldfPath = Join-Path $DataPath "${DatabaseName}_log.ldf"
    
    Write-Host "Checking if database exists..." -ForegroundColor Yellow
    
    # Check if database files already exist
    if ((Test-Path $mdfPath) -or (Test-Path $ldfPath)) {
        Write-Host "? Database files already exist:" -ForegroundColor Yellow
        if (Test-Path $mdfPath) { Write-Host "  - $mdfPath" -ForegroundColor Gray }
        if (Test-Path $ldfPath) { Write-Host "  - $ldfPath" -ForegroundColor Gray }
        
        $response = Read-Host "Do you want to delete and recreate? (y/N)"
        if ($response -ne 'y' -and $response -ne 'Y') {
            Write-Host "? Using existing database files" -ForegroundColor Green
            return $true
        }
        
        Write-Host "Deleting existing database files..." -ForegroundColor Yellow
        
        # Try to detach the database first
        try {
            $connectionString = "Server=(localdb)\MSSQLLocalDB;Integrated Security=true;Connect Timeout=30"
            $connection = New-Object System.Data.SqlClient.SqlConnection($connectionString)
            $connection.Open()
            
            $detachCommand = $connection.CreateCommand()
            $detachCommand.CommandText = "IF EXISTS (SELECT name FROM sys.databases WHERE name = '$DatabaseName') ALTER DATABASE [$DatabaseName] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [$DatabaseName];"
            $detachCommand.ExecuteNonQuery() | Out-Null
            
            $connection.Close()
            Write-Host "? Existing database detached" -ForegroundColor Green
        }
        catch {
            Write-Host "? Could not detach database (may not be attached)" -ForegroundColor Yellow
        }
        
        # Delete the files
        if (Test-Path $mdfPath) { Remove-Item $mdfPath -Force }
        if (Test-Path $ldfPath) { Remove-Item $ldfPath -Force }
        
        Write-Host "? Old database files deleted" -ForegroundColor Green
    }
    
    # Create the database
    Write-Host "Creating new database '$DatabaseName'..." -ForegroundColor Yellow
    
    try {
        $connectionString = "Server=(localdb)\MSSQLLocalDB;Integrated Security=true;Connect Timeout=30"
        $connection = New-Object System.Data.SqlClient.SqlConnection($connectionString)
        $connection.Open()
        
        $createCommand = $connection.CreateCommand()
        $createCommand.CommandText = @"
CREATE DATABASE [$DatabaseName]
ON PRIMARY (
    NAME = '${DatabaseName}_Data',
    FILENAME = '$mdfPath',
    SIZE = 10MB,
    MAXSIZE = UNLIMITED,
    FILEGROWTH = 10MB
)
LOG ON (
    NAME = '${DatabaseName}_Log',
    FILENAME = '$ldfPath',
    SIZE = 5MB,
    MAXSIZE = UNLIMITED,
    FILEGROWTH = 5MB
);
"@
        
        $createCommand.ExecuteNonQuery() | Out-Null
        $connection.Close()
        
        Write-Host "? Database created successfully" -ForegroundColor Green
        Write-Host "  - MDF: $mdfPath" -ForegroundColor Gray
        Write-Host "  - LDF: $ldfPath" -ForegroundColor Gray
        
        return $true
    }
    catch {
        Write-Host "? Failed to create database: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Function to update appsettings.json
function Update-AppSettings {
    param(
        [string]$DataPath
    )
    
    Write-Host "Updating appsettings.json..." -ForegroundColor Yellow
    
    $appSettingsPath = ".\appsettings.json"
    
    if (-not (Test-Path $appSettingsPath)) {
        Write-Host "? appsettings.json not found, skipping update" -ForegroundColor Yellow
        return
    }
    
    try {
        $appSettings = Get-Content $appSettingsPath -Raw | ConvertFrom-Json
        
        # Update the connection string with the correct data directory
        $newConnectionString = "Data Source=(localdb)\MSSQLLocalDB;AttachDbFilename=$DataPath\Umbraco.mdf;Integrated Security=True"
        
        if ($appSettings.ConnectionStrings.umbracoDbDSN -ne $newConnectionString) {
            $appSettings.ConnectionStrings.umbracoDbDSN = $newConnectionString
            
            $appSettings | ConvertTo-Json -Depth 10 | Set-Content $appSettingsPath
            
            Write-Host "? appsettings.json updated with correct path" -ForegroundColor Green
        }
        else {
            Write-Host "? appsettings.json already has correct path" -ForegroundColor Green
        }
    }
    catch {
        Write-Host "? Could not update appsettings.json: $($_.Exception.Message)" -ForegroundColor Yellow
    }
}

# Function to display next steps
function Show-NextSteps {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "Setup Complete!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Next Steps:" -ForegroundColor Yellow
    Write-Host "1. Run the application:" -ForegroundColor White
    Write-Host "   dotnet run" -ForegroundColor Gray
    Write-Host ""
    Write-Host "2. Navigate to:" -ForegroundColor White
    Write-Host "   https://localhost:[PORT]/umbraco" -ForegroundColor Gray
    Write-Host ""
    Write-Host "3. Complete the Umbraco installer" -ForegroundColor White
    Write-Host "   - The database is already created" -ForegroundColor Gray
    Write-Host "   - Create your admin account" -ForegroundColor Gray
    Write-Host "   - The ContentActivityLog table will be created automatically" -ForegroundColor Gray
    Write-Host ""
    Write-Host "4. Access the Content Activity Tracker dashboard:" -ForegroundColor White
    Write-Host "   Content ? Content Activity" -ForegroundColor Gray
    Write-Host ""
}

# Main execution
try {
    # Check if LocalDB is installed
    Write-Host "Step 1: Checking SQL Server LocalDB..." -ForegroundColor Cyan
    if (-not (Test-LocalDBInstalled)) {
        Write-Host "? SQL Server LocalDB is not installed" -ForegroundColor Red
        Write-Host ""
        Write-Host "Please install SQL Server LocalDB:" -ForegroundColor Yellow
        Write-Host "1. Download from: https://aka.ms/ssmsfullsetup" -ForegroundColor White
        Write-Host "2. Or install SQL Server Express: https://www.microsoft.com/sql-server/sql-server-downloads" -ForegroundColor White
        Write-Host ""
        exit 1
    }
    Write-Host "? SQL Server LocalDB is installed" -ForegroundColor Green
    Write-Host ""
    
    # Initialize LocalDB instance
    Write-Host "Step 2: Initializing LocalDB instance..." -ForegroundColor Cyan
    if (-not (Initialize-LocalDBInstance)) {
        Write-Host "? Failed to initialize LocalDB instance" -ForegroundColor Red
        exit 1
    }
    Write-Host ""
    
    # Create data directory
    Write-Host "Step 3: Setting up data directory..." -ForegroundColor Cyan
    $fullDataPath = Initialize-DataDirectory -Path $DataDirectory
    Write-Host ""
    
    # Create database
    Write-Host "Step 4: Creating Umbraco database..." -ForegroundColor Cyan
    if (-not (New-UmbracoDatabase -DatabaseName $DatabaseName -DataPath $fullDataPath)) {
        Write-Host "? Failed to create database" -ForegroundColor Red
        exit 1
    }
    Write-Host ""
    
    # Update appsettings
    Write-Host "Step 5: Updating configuration..." -ForegroundColor Cyan
    Update-AppSettings -DataPath $fullDataPath
    Write-Host ""
    
    # Show next steps
    Show-NextSteps
    
    exit 0
}
catch {
    Write-Host ""
    Write-Host "? Setup failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "Stack trace:" -ForegroundColor Gray
    Write-Host $_.Exception.StackTrace -ForegroundColor Gray
    Write-Host ""
    exit 1
}
