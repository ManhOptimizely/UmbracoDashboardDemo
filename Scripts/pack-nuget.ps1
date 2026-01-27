#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Packs the Umbraco Content Activity Tracker project into a NuGet package.

.DESCRIPTION
    This script builds and packs the UmbracoContentActivity project into a NuGet package
    suitable for distribution and installation in Umbraco CMS projects.

.PARAMETER Configuration
    The build configuration (Debug or Release). Default: Release

.PARAMETER OutputPath
    The output directory for the NuGet package. Default: ./nupkg

.PARAMETER Version
    The package version. If not specified, uses version from .csproj or defaults to 1.0.0

.EXAMPLE
    .\pack-nuget.ps1 -OutputPath "C:\Packages"
#>

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet("Debug", "Release")]
    [string]$Configuration = "Release",
    
    [Parameter(Mandatory=$false)]
    [string]$OutputPath = "./nupkg",
    
    [Parameter(Mandatory=$false)]
    [string]$Version = "1.0.0"
)

# Script variables
$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectFile = Join-Path (Split-Path -Parent $ScriptDir) "UmbracoContentActivity.csproj"
$PackageId = "UmbracoContentActivity"
$Authors = "Manv"
$Description = "Content Activity Tracker Dashboard for Umbraco 17 CMS."
$PackageTags = "Umbraco;Dashboard;ContentTracking;ActivityLog;SignalR"
$RepositoryUrl = "https://github.com/ManhOptimizely/UmbracoDashboardDemo"
$Copyright = "Copyright © $(Get-Date -Format yyyy)"
$LicenseExpression = "MIT"

# Colors for output
function Write-Info { param($msg) Write-Host $msg -ForegroundColor Cyan }
function Write-Success { param($msg) Write-Host $msg -ForegroundColor Green }
function Write-Error-Custom { param($msg) Write-Host $msg -ForegroundColor Red }

# Banner
Write-Host ""
Write-Host "===================================================" -ForegroundColor Magenta
Write-Host "   Umbraco Content Activity Tracker - NuGet Pack   " -ForegroundColor Magenta
Write-Host "===================================================" -ForegroundColor Magenta
Write-Host ""

# Validate project file exists
if (-not (Test-Path $ProjectFile)) {
    Write-Error-Custom "ERROR: Project file '$ProjectFile' not found!"
    exit 1
}

# Create output directory if it doesn't exist
if (-not (Test-Path $OutputPath)) {
    Write-Info "Creating output directory: $OutputPath"
    New-Item -ItemType Directory -Path $OutputPath -Force | Out-Null
}

# Get absolute path for output
$OutputPath = (Resolve-Path $OutputPath).Path

# Display build settings
Write-Info "Build Configuration:"
Write-Host "  Project File: $ProjectFile" -ForegroundColor White
Write-Host "  Configuration: $Configuration" -ForegroundColor White
Write-Host "  Output Path: $OutputPath" -ForegroundColor White
if ($Version) {
    Write-Host "  Version: $Version" -ForegroundColor White
}
Write-Host ""

# Clean previous builds
Write-Info "Cleaning previous builds..."
try {
    dotnet clean $ProjectFile --configuration $Configuration --verbosity quiet
    if ($LASTEXITCODE -ne 0) {
        throw "Clean failed with exit code $LASTEXITCODE"
    }
    Write-Success "Clean completed"
} catch {
    Write-Error-Custom "ERROR: Clean failed - $_"
    exit 1
}

# Restore NuGet packages
Write-Info "Restoring NuGet packages..."
try {
    dotnet restore $ProjectFile --verbosity quiet
    if ($LASTEXITCODE -ne 0) {
        throw "Restore failed with exit code $LASTEXITCODE"
    }
    Write-Success "Restore completed"
} catch {
    Write-Error-Custom "ERROR: Restore failed - $_"
    exit 1
}

# Build the project
Write-Info "Building project..."
try {
    dotnet build $ProjectFile --configuration $Configuration --no-restore --verbosity quiet
    if ($LASTEXITCODE -ne 0) {
        throw "Build failed with exit code $LASTEXITCODE"
    }
    Write-Success "Build completed"
} catch {
    Write-Error-Custom "ERROR: Build failed - $_"
    exit 1
}

# Pack the project
Write-Info "Creating NuGet package..."
Write-Host ""
try {
    # Build the dotnet pack command as a string for better control
    $packCommand = "pack `"$ProjectFile`" --configuration $Configuration --no-build --output `"$OutputPath`""
    
    if ($Version) {
        $packCommand += " -p:PackageVersion=$Version -p:Version=$Version"
    }
    
    Write-Host "Running command:" -ForegroundColor Yellow
    Write-Host "  dotnet $packCommand" -ForegroundColor Gray
    Write-Host ""
    
    # Execute the pack command
    Invoke-Expression "dotnet $packCommand"
    
    if ($LASTEXITCODE -ne 0) {
        throw "Pack failed with exit code $LASTEXITCODE"
    }
    Write-Host ""
    Write-Success "NuGet package created successfully!"
} catch {
    Write-Error-Custom "ERROR: Pack failed - $_"
    exit 1
}

# Find the created package
Write-Host ""
Write-Info "Package details:"
$packages = Get-ChildItem -Path $OutputPath -Filter "*.nupkg" | Sort-Object LastWriteTime -Descending
if ($packages) {
    $latestPackage = $packages[0]
    Write-Host "  Name: " -NoNewline -ForegroundColor White
    Write-Host $latestPackage.Name -ForegroundColor Green
    Write-Host "  Size: " -NoNewline -ForegroundColor White
    Write-Host "$([math]::Round($latestPackage.Length / 1KB, 2)) KB" -ForegroundColor Green
    Write-Host "  Path: " -NoNewline -ForegroundColor White
    Write-Host $latestPackage.FullName -ForegroundColor Green
} else {
    Write-Error-Custom "WARNING: No package file found in output directory"
}

Write-Host ""
Write-Host "===================================================" -ForegroundColor Magenta
Write-Success "          Package creation completed!              "
Write-Host "===================================================" -ForegroundColor Magenta
Write-Host ""
