---
layout: post
title: "CI/CD for .NET: From Zero to Production in 1 Day"
permalink: /blog/cicd-for-dotnet-from-zero-to-production/
slug: "cicd-for-dotnet-from-zero-to-production"
category: tutorial
tags: [.NET, CI/CD, DevOps, Azure DevOps, Automation, Deployment]
date: 2025-09-10
read_time: 19
description: "Learn how to set up a complete CI/CD pipeline for .NET applications in one day, with practical examples and real-world results from production deployments."
---

## Introduction

Manual deployments are like washing dishes by hand in a restaurant kitchen - it works for a small family dinner, but when you're serving hundreds of customers, you need industrial-grade automation. I learned this lesson the hard way when a manual deployment at 2 AM caused a 4-hour outage. I was copying files via FTP, running SQL scripts manually, and praying nothing broke. Something broke. The next day, we committed to building a CI/CD pipeline that would get code from development to production safely and automatically. Best decision we ever made.

## The Before Picture: Manual Deployment Chaos

### Our Pre-Automation Reality

- **Deployment Checklist**: 35-step Word document
- **Manual SQL Scripts**: Copied and pasted between environments
- **IIS Configuration**: Manual setup on each server
- **Testing**: 'It works on my machine' approach
- **Rollbacks**: Restore from backup (2+ hours)

### The Breaking Point

Our breaking point came when we had 3 simultaneous projects needing deployment. The coordination overhead was crushing development velocity.

## The 1-Day CI/CD Foundation

### Morning: Source Control and Build Automation (9 AM - 12 PM)

**Step 1: Git Strategy**

We adopted trunk-based development with feature flags:

```yaml
# Branch strategy
main (always deployable)
├── feature/user-authentication
├── feature/payment-integration  
└── hotfix/urgent-fix
```

**Step 2: Azure DevOps Project Setup**

This is the configuration file that tells Azure DevOps when to run and what to use:

```yaml
# azure-pipelines.yml - This file lives in your repo root
trigger:
- main  # Run pipeline whenever code is pushed to main branch

pool:
  vmImage: 'windows-latest'  # Use Windows VM (needed for .NET Framework apps)

variables:
  buildConfiguration: 'Release'  # Build in Release mode (optimized)
  solution: '**/*.sln'          # Find all .sln files in the repo
```

**What this does:** When you push code to the `main` branch, Azure DevOps automatically starts a build using a Windows VM, looking for all solution files.

**Step 3: Basic Build Pipeline**

This defines the actual build steps - restore packages, build, test:

```yaml
steps:
# Step 1: Install NuGet (package manager for .NET)
- task: NuGetToolInstaller@1
  # This ensures we have NuGet available

# Step 2: Restore NuGet packages (download dependencies)
- task: NuGetCommand@2
  inputs:
    restoreSolution: '$(solution)'  # Restore packages for all .sln files
    # This downloads all NuGet packages your project needs

# Step 3: Build the solution
- task: VSBuild@1
  inputs:
    solution: '$(solution)'
    # These MSBuild arguments tell it to create a deployment package
    msbuildArgs: '/p:DeployOnBuild=true /p:WebPublishMethod=Package /p:PackageAsSingleFile=true /p:SkipInvalidConfigurations=true'
    platform: 'Any CPU'              # Build for any CPU architecture
    configuration: '$(buildConfiguration)'  # Use Release configuration

# Step 4: Run tests
- task: VSTest@2
  inputs:
    platform: 'Any CPU'
    configuration: '$(buildConfiguration)'
    # This runs all unit tests - if tests fail, pipeline stops
```

**What happens:** NuGet restores packages → Code compiles → Tests run. If any step fails, the pipeline stops and you get notified. This catches problems before they reach production.

### Afternoon: Deployment Automation (1 PM - 5 PM)

**Step 4: Environment Setup**

We created three environments:

- **Development**: Automatic deployment from main branch
- **Staging**: Manual approval required
- **Production**: Manual approval + business sign-off

**Step 5: Deployment Pipeline**

Once the build succeeds, we deploy to Azure. This task takes the built package and deploys it:

```yaml
# Deployment to Azure App Service
- task: AzureWebApp@1
  inputs:
    azureSubscription: 'Azure Connection'  # Your Azure subscription connection
    appType: 'webApp'                       # It's a web application
    appName: 'my-dotnet-app'                # Name of your Azure App Service
    package: '$(Build.ArtifactStagingDirectory)/**/*.zip'  # The zip file from build step
    deploymentMethod: 'auto'                # Automatic deployment (no manual steps)
```

**What happens:** The task takes the zip file created during build, connects to Azure, and deploys it to your App Service. The app goes live automatically (or to staging if configured).

**Step 6: Database Migrations**

We automated database deployments using DbUp. This library runs SQL migration scripts automatically:

```csharp
// DbUp reads SQL scripts embedded in your assembly and runs them in order
var upgrader = DeployChanges.To
    .SqlDatabase(connectionString)                              // Connect to your database
    .WithScriptsEmbeddedInAssembly(Assembly.GetExecutingAssembly())  // Find SQL scripts in your DLL
    .LogToConsole()                                             // Show what's happening
    .Build();

// This runs all migration scripts that haven't been run yet
var result = upgrader.PerformUpgrade();
// If migration fails, it throws an exception and deployment stops
```

**How it works:** You write SQL migration scripts (like `001_CreateUsersTable.sql`, `002_AddEmailColumn.sql`) and embed them in your project. DbUp tracks which scripts have run and only executes new ones. This ensures your database schema stays in sync with your code automatically.

### Evening: Basic Monitoring and Rollback (6 PM - 8 PM)

**Step 7: Health Checks**

After deployment, we need to verify the app is actually working. Health checks do that:

```csharp
// Basic health check endpoint - call this after deployment to verify everything works
[HttpGet("health")]
public IActionResult Health()
{
    try
    {
        // Try to execute a simple SQL query - if database is accessible, this works
        _dbContext.Database.ExecuteSqlRaw("SELECT 1");
        // If we get here, database is reachable and app is healthy
        return Ok(new { status = "Healthy", timestamp = DateTime.UtcNow });
    }
    catch (Exception ex)
    {
        // If database query fails, app is unhealthy
        return StatusCode(500, new { status = "Unhealthy", error = ex.Message });
    }
}
```

**How it's used:** After deployment, the pipeline calls `/health`. If it returns "Healthy", deployment succeeded. If it returns "Unhealthy", something's wrong and we can rollback automatically.

**Step 8: Automated Rollback**

If something goes wrong, we can instantly rollback by swapping deployment slots:

```yaml
# Simple rollback strategy using Azure deployment slots
- task: AzureAppServiceManage@0
  inputs:
    azureSubscription: 'Azure Connection'
    Action: 'Swap Slots'                    # Swap staging and production slots
    WebAppName: 'my-dotnet-app'
    SourceSlot: 'staging'                   # Swap staging slot back to production
    # This instantly reverts to the previous version
```

**How slots work:** Azure App Service has "slots" - think of them as separate environments. You deploy new code to the "staging" slot, test it, then swap it with "production". If something's wrong, swap back - instant rollback without redeploying.

## The Results: Immediate Impact

### What We Achieved in One Day

- **Build Time**: 45 minutes → 8 minutes
- **Deployment Frequency**: Weekly → Daily
- **Deployment Success Rate**: 70% → 95%
- **Rollback Time**: 2 hours → 5 minutes

### Developer Experience Transformation

- **Before**: "I hope this deployment works"
- **After**: "The pipeline will tell us if there are issues"

## Advanced CI/CD Patterns We Added Later

### Pattern 1: Blue-Green Deployments

Zero-downtime deployments became our standard:

```yaml
# Blue-green deployment strategy
- stage: DeployToGreen
  displayName: 'Deploy to Green Slot'
  jobs:
  - deployment: Deploy
    environment: 'production-green'
    strategy:
      runOnce:
        deploy:
          steps:
          - download: current
          - task: AzureWebApp@1
            inputs:
              azureSubscription: 'Azure Connection'
              appType: 'webApp'
              appName: 'my-dotnet-app'
              deployToSlotOrASE: true
              slotName: 'green'

- stage: SwitchTraffic
  displayName: 'Switch Traffic to Green'
  dependsOn: DeployToGreen
  condition: succeeded()
  jobs:
  - job: Switch
    steps:
    - task: AzureAppServiceManage@0
      inputs:
        azureSubscription: 'Azure Connection'
        Action: 'Swap Slots'
        WebAppName: 'my-dotnet-app'
        SourceSlot: 'green'
```

### Pattern 2: Database Deployment Safety

We implemented safe database deployments:

```csharp
public class SafeDatabaseDeployer
{
    public async Task<bool> DeployAsync(string connectionString)
    {
        // Pre-deployment checks
        await VerifyBackupExistsAsync(connectionString);
        await VerifyMaintenanceWindowAsync();
        
        // Deploy in transaction
        using var transaction = await BeginTransactionAsync(connectionString);
        try
        {
            await RunMigrationsAsync(connectionString);
            await VerifyDeploymentAsync(connectionString);
            await transaction.CommitAsync();
            return true;
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync();
            _logger.LogError(ex, "Database deployment failed");
            return false;
        }
    }
}
```

### Pattern 3: Canary Deployments

Gradual traffic shifting for risk reduction:

```yaml
- stage: DeployCanary
  displayName: 'Canary Deployment (10% traffic)'
  jobs:
  - deployment: DeployCanary
    environment: 'production-canary'
    strategy:
      canary:
        increments: [10]
        preDeploy:
          steps:
          - script: echo "Routing 10% traffic to canary"
        deploy:
          steps:
          - download: current
          - task: AzureWebApp@1
            inputs:
              azureSubscription: 'Azure Connection'
              appType: 'webApp'
              appName: 'my-dotnet-app-canary'
```

## Testing Strategy in CI/CD

### Our Testing Pyramid in Pipeline

```yaml
steps:
# Unit Tests (Fast)
- task: DotNetCoreCLI@2
  displayName: 'Run Unit Tests'
  inputs:
    command: 'test'
    arguments: '--configuration $(buildConfiguration) --filter Category=Unit'

# Integration Tests (Medium)
- task: DotNetCoreCLI@2
  displayName: 'Run Integration Tests'
  inputs:
    command: 'test'
    arguments: '--configuration $(buildConfiguration) --filter Category=Integration'

# API Tests (Slow)
- task: DotNetCoreCLI@2
  displayName: 'Run API Tests'
  inputs:
    command: 'test'
    arguments: '--configuration $(buildConfiguration) --filter Category=API'
```

## Security Scanning Integration

```yaml
# Security scanning
- task: CredScan@2
  inputs:
    toolMajorVersion: 'V2'

- task: PoliCheck@1
  inputs:
    inputType: 'Basic'
    targetType: 'F'

- task: SdtReport@1
  displayName: 'Security Analysis'
```

## Monitoring and Feedback Loops

### Pipeline Analytics

- Build success/failure rates
- Test coverage trends
- Deployment frequency
- Lead time for changes

### Application Performance in Pipeline

```yaml
# Performance testing
- task: PublishBuildArtifacts@1
  condition: and(succeeded(), eq(variables['Build.SourceBranch'], 'refs/heads/main'))

- task: AzureLoadTest@1
  inputs:
    loadTestConfigFile: 'loadtest.yaml'
    loadTestRunName: 'PerfTest-$(Build.BuildNumber)'
```

## The Business Impact

### Quantifiable Benefits

- **Development Velocity**: 3x faster feature delivery
- **Quality**: 80% reduction in production incidents
- **Team Morale**: Developers could focus on coding, not deployment
- **Business Agility**: Could respond to market changes faster

### Cost Savings

- **Reduced Overtime**: No more late-night deployments
- **Fewer Rollbacks**: Automated testing caught issues early
- **Better Resource Utilization**: Infrastructure scaled automatically

## Common Pitfalls and Solutions

**Pitfall 1: The Monolithic Pipeline**

One massive pipeline that does everything. Solution: Break into smaller, focused pipelines.

**Pitfall 2: Ignoring Database Deployments**

Application deploys but database doesn't. Solution: Include database migrations in pipeline.

**Pitfall 3: No Rollback Strategy**

Deployment fails with no way back. Solution: Implement automated rollback procedures.

**Pitfall 4: Slow Feedback Loops**

Tests take hours to run. Solution: Parallelize and optimize test execution.

## Your 1-Day CI/CD Checklist

**Morning (Infrastructure):**

- Source control strategy defined
- Build pipeline created
- Basic testing implemented
- Artifact management setup

**Afternoon (Deployment):**

- Environment configuration
- Deployment pipeline created
- Database migration automation
- Basic monitoring implemented

**Evening (Optimization):**

- Health checks added
- Rollback strategy tested
- Documentation updated
- Team training conducted

## The Cultural Transformation

**Before CI/CD:**

- "You broke the build!"
- "Whose turn is it to deploy?"
- "It worked on my machine"

**After CI/CD:**

- "The pipeline will validate our changes"
- "We can deploy with confidence"
- "Feedback is immediate and actionable"

## The Bottom Line

CI/CD isn't just about automation - it's about creating a culture of continuous improvement. That one day we invested in building our foundation paid back in reduced stress, faster delivery, and higher quality. No more 2 AM deployments, no more "it works on my machine" excuses, no more deployment anxiety. Start simple, get something working, and iterate. The perfect pipeline is the enemy of the good pipeline. Get something working today, improve it tomorrow.

