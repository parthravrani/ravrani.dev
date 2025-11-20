---
layout: post
title: "Database Sharding Strategies for High-Traffic .NET Apps"
permalink: /blog/database-sharding-strategies-high-traffic-dotnet-apps/
slug: "database-sharding-strategies-high-traffic-dotnet-apps"
category: tutorial
tags: [.NET, Databases, Sharding, Scalability, MySQL, MongoDB, SQL Server]
date: 2025-09-05
read_time: 20
description: "Learn effective database sharding strategies for high-traffic .NET applications, with real-world examples from Voila Cabs on geographic, customer, and time-based sharding."
---

## Introduction

Your database is like a growing city. At first, one neighborhood handles everything fine. But as population grows, traffic jams become inevitable. That's exactly what happened with Voila Cabs when we hit thousands of concurrent users. Our single SQL Server instance was groaning under the load, and we needed a solution that could scale horizontally. That's when we turned to sharding.

## The Breaking Point: When One Database Isn't Enough

### Our Pre-Sharding Nightmare

- **Query Timeouts**: 30-second queries during peak hours
- **Deadlocks**: Multiple processes fighting for the same resources
- **Backup Windows**: 4-hour backup processes affecting performance
- **Storage Limits**: Running out of disk space monthly

### The Wake-Up Call

It was Friday evening, peak ride hours, and our database server crashed. For three hours, thousands of users couldn't book rides. That weekend, we committed to implementing a sharding strategy.

## Understanding Sharding: Beyond Basic Partitioning

### What Sharding Really Means

Sharding is horizontal partitioning at the database level. Instead of one massive database, you have multiple smaller databases (shards) that each contain a subset of your data.

### Key Concepts

- **Shard Key**: The field used to determine which shard gets the data
- **Shard Map**: The routing table that knows which data lives where
- **Shard Locator**: The component that routes queries to the right shard

## Our Sharding Implementation Journey

### Phase 1: Geographic Sharding - The Natural Starting Point

**The Strategy:**

We divided our data by city since ride bookings are inherently geographic. Mumbai rides don't need to be in the same database as Delhi rides - they're completely separate. This made geographic sharding a natural fit.

Here's how we implemented the shard selection logic:

```csharp
public class GeographicShardStrategy : IShardStrategy
{
    // This dictionary maps each city to its shard (database)
    // Mumbai rides go to Shard1, Delhi rides go to Shard2, etc.
    private readonly Dictionary<string, string> _cityToShardMap;
    
    public GeographicShardStrategy()
    {
        _cityToShardMap = new Dictionary<string, string>
        {
            ["mumbai"] = "Shard1",      // All Mumbai data in Shard1
            ["delhi"] = "Shard2",        // All Delhi data in Shard2
            ["bangalore"] = "Shard3",   // All Bangalore data in Shard3
            ["chennai"] = "Shard4",
            ["kolkata"] = "Shard5",
            ["hyderabad"] = "Shard6"
        };
    }
    
    // Given a city name, figure out which shard (database) it belongs to
    public string GetShardForCity(string city)
    {
        if (_cityToShardMap.TryGetValue(city.ToLower(), out var shard))
            return shard; // Found it - return the shard name
            
        // Default shard for unknown cities (new cities go to Shard1)
        return "Shard1";
    }
}
```

**The Shard Router Implementation:**

Now we need a router that takes a query, figures out which shard to use, and executes the query on that shard:

```csharp
public class ShardRouter
{
    private readonly IShardStrategy _shardStrategy; // Knows which city goes to which shard
    private readonly IShardConnectionFactory _connectionFactory; // Knows connection strings for each shard
    
    // This method takes a city and a query function, routes to the right shard, executes query
    public async Task<T> ExecuteShardedQueryAsync<T>(string city, Func<IDbConnection, Task<T>> query)
    {
        // Step 1: Figure out which shard this city belongs to
        var shardName = _shardStrategy.GetShardForCity(city);
        
        // Step 2: Get the connection string for that shard
        var connectionString = _connectionFactory.GetConnectionString(shardName);
        
        // Step 3: Open connection to that specific shard
        using var connection = new SqlConnection(connectionString);
        await connection.OpenAsync();
        
        // Step 4: Execute the query on that shard
        return await query(connection);
    }
}

// Usage example - notice how simple it is for the caller
public async Task<List<Ride>> GetRidesByCityAsync(string city, DateTime date)
{
    // We just pass the city - the router figures out which shard to use
    return await _shardRouter.ExecuteShardedQueryAsync(city, async connection => 
    {
        // This SQL runs on the shard for that city
        const string sql = @"SELECT * FROM Rides 
                           WHERE City = @City AND RideDate = @Date";
        
        // Execute query on the correct shard
        return (await connection.QueryAsync<Ride>(sql, new { City = city, Date = date }))
               .ToList();
    });
}
```

**What's happening:** When you call `GetRidesByCityAsync("mumbai", date)`, the router looks up "mumbai" in the strategy, finds it maps to "Shard1", gets the connection string for Shard1, opens a connection to that database, and runs your query there. All Mumbai rides are in Shard1, so the query is fast and doesn't affect other cities' data.

### Phase 2: Range-Based Sharding for Time-Series Data

**The Problem:**

Our ride history table was growing exponentially. We needed to shard by time ranges because old rides don't need to be in the same database as current rides. This is perfect for time-series data where you mostly query recent data.

Here's how we sharded by time:

```csharp
public class TimeRangeShardStrategy : IShardStrategy
{
    // Given a date, figure out which time-based shard it belongs to
    public string GetShardForDate(DateTime date)
    {
        var year = date.Year;   // 2024, 2025, etc.
        var month = date.Month;  // 1-12
        
        // Each shard handles 3 months of data (a quarter)
        // Q1 = Jan-Mar, Q2 = Apr-Jun, Q3 = Jul-Sep, Q4 = Oct-Dec
        var quarter = (month - 1) / 3 + 1;
        
        // Returns something like "Shard_Time_2024_Q1" or "Shard_Time_2025_Q3"
        return $"Shard_Time_{year}_Q{quarter}";
    }
}
```

**How this works:** If you query rides from January 2024, it goes to `Shard_Time_2024_Q1`. If you query rides from July 2024, it goes to `Shard_Time_2024_Q3`. This means each shard only contains 3 months of data, making queries much faster. Old shards can even be archived to cheaper storage since they're rarely accessed.

### Phase 3: Hash-Based Sharding for Even Distribution

**For User Data:**

We used consistent hashing to distribute users evenly across shards. Unlike geographic sharding where Mumbai naturally goes to one shard, users don't have a natural grouping. Hash-based sharding ensures users are evenly distributed across all shards.

Here's how it works:

```csharp
public class HashShardStrategy : IShardStrategy
{
    private const int TotalShards = 8; // We have 8 shards for users
    
    public string GetShardForUserId(int userId)
    {
        // Step 1: Convert userId to a hash (consistent - same userId always gets same hash)
        var hash = CalculateConsistentHash(userId.ToString());
        
        // Step 2: Use modulo to determine which shard (0-7)
        var shardIndex = hash % TotalShards;
        
        // Step 3: Return shard name (Shard_User_1 through Shard_User_8)
        return $"Shard_User_{shardIndex + 1}";
    }
    
    // This creates a consistent hash - same input always produces same output
    private int CalculateConsistentHash(string input)
    {
        using var md5 = MD5.Create();
        // Convert string to bytes, hash it
        var hash = md5.ComputeHash(Encoding.UTF8.GetBytes(input));
        // Convert hash bytes to integer
        return BitConverter.ToInt32(hash, 0) & 0x7FFFFFFF; // & 0x7FFFFFFF ensures positive number
    }
}
```

**Why hash-based:** User ID 12345 might hash to Shard_User_3, User ID 67890 might hash to Shard_User_7. This distributes users randomly but consistently (same user always goes to same shard). The benefit is even load distribution - no single shard gets overloaded with too many users. The downside is you can't easily query "all users in Mumbai" because they're scattered across all shards.

## Cross-Shard Operations: The Complex Part

### Handling Queries Across Multiple Shards

Sometimes you need data from multiple shards. For example, if someone searches for rides across Mumbai, Delhi, and Bangalore, you need to query three different shards and combine the results. Here's how we handle that:

```csharp
public class CrossShardQueryExecutor
{
    // This executes the same query on multiple shards in parallel, then combines results
    public async Task<List<T>> ExecuteCrossShardQueryAsync<T>(
        IEnumerable<string> shards,  // Which shards to query (e.g., ["Shard1", "Shard2", "Shard3"])
        Func<IDbConnection, Task<List<T>>> queryPerShard) // The query to run on each shard
    {
        // Step 1: Create a task for each shard - they'll run in parallel
        var tasks = shards.Select(async shard =>
        {
            // Get connection string for this specific shard
            var connectionString = _connectionFactory.GetConnectionString(shard);
            using var connection = new SqlConnection(connectionString);
            // Execute the query on this shard
            return await queryPerShard(connection);
        });
        
        // Step 2: Wait for all shards to complete (they run in parallel!)
        var results = await Task.WhenAll(tasks);
        
        // Step 3: Combine all results from all shards into one list
        return results.SelectMany(x => x).ToList();
    }
}

// Example: Get all rides across multiple cities
public async Task<List<Ride>> SearchRidesAsync(List<string> cities, DateTime date)
{
    // Step 1: Figure out which shards we need to query
    // Mumbai -> Shard1, Delhi -> Shard2, Bangalore -> Shard3
    var shards = cities.Select(c => _shardStrategy.GetShardForCity(c)).Distinct();
    
    // Step 2: Query all those shards in parallel and combine results
    return await _crossShardExecutor.ExecuteCrossShardQueryAsync(shards, async connection =>
    {
        // This query runs on each shard - we filter by cities that belong to this shard
        const string sql = @"SELECT * FROM Rides 
                           WHERE City IN @Cities AND RideDate = @Date";
        
        // Execute on this shard - returns rides from cities in this shard
        return (await connection.QueryAsync<Ride>(sql, new { Cities = cities, Date = date }))
               .ToList();
    });
    // Final result: All rides from all cities, combined from multiple shards
}
```

**What's happening:** If you search for rides in Mumbai, Delhi, and Bangalore, the executor:
1. Identifies these map to Shard1, Shard2, and Shard3
2. Runs the query on all three shards simultaneously (parallel execution)
3. Waits for all three to complete
4. Combines the results into one list

This is more complex than single-shard queries, but it's necessary when you need data that spans multiple shards. The parallel execution keeps it fast.

## Shard Management and Monitoring

### Our Shard Management Dashboard

```csharp
public class ShardMonitor
{
    public async Task<ShardHealthReport> GetShardHealthAsync()
    {
        var shards = _shardStrategy.GetAllShards();
        var healthTasks = shards.Select(CheckShardHealthAsync);
        var healthReports = await Task.WhenAll(healthTasks);
        
        return new ShardHealthReport
        {
            Timestamp = DateTime.UtcNow,
            ShardReports = healthReports.ToList(),
            OverallHealth = CalculateOverallHealth(healthReports)
        };
    }
    
    private async Task<ShardHealth> CheckShardHealthAsync(string shardName)
    {
        var connectionString = _connectionFactory.GetConnectionString(shardName);
        
        using var connection = new SqlConnection(connectionString);
        
        var health = new ShardHealth
        {
            ShardName = shardName,
            IsOnline = await IsDatabaseOnlineAsync(connection),
            ConnectionCount = await GetActiveConnectionsAsync(connection),
            DiskUsage = await GetDiskUsageAsync(connection),
            QueryPerformance = await GetQueryPerformanceAsync(connection)
        };
        
        return health;
    }
}
```

### Automated Shard Splitting

```csharp
public class ShardManager
{
    public async Task<bool> SplitShardAsync(string sourceShard, string newShard1, string newShard2)
    {
        try
        {
            // 1. Create new shards
            await CreateShardAsync(newShard1);
            await CreateShardAsync(newShard2);
            
            // 2. Copy data based on split criteria
            await SplitDataAsync(sourceShard, newShard1, newShard2);
            
            // 3. Update shard map
            await UpdateShardMapAsync(sourceShard, newShard1, newShard2);
            
            // 4. Verify data integrity
            await VerifySplitAsync(sourceShard, newShard1, newShard2);
            
            // 5. Remove old shard (or keep for backup)
            await ArchiveShardAsync(sourceShard);
            
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to split shard {SourceShard}", sourceShard);
            await RollbackShardSplitAsync(sourceShard, newShard1, newShard2);
            return false;
        }
    }
}
```

## Data Migration Strategy

### The Zero-Downtime Migration

```csharp
public class ShardMigrationService
{
    public async Task MigrateDataAsync(string sourceShard, string targetShard, 
        Func<dynamic, bool> migrationCriteria)
    {
        // Phase 1: Dual write
        await EnableDualWritesAsync(sourceShard, targetShard);
        
        // Phase 2: Copy existing data
        await CopyExistingDataAsync(sourceShard, targetShard, migrationCriteria);
        
        // Phase 3: Verify data consistency
        await VerifyDataConsistencyAsync(sourceShard, targetShard);
        
        // Phase 4: Switch reads to target
        await SwitchReadsToTargetAsync(targetShard);
        
        // Phase 5: Disable source writes
        await DisableSourceWritesAsync(sourceShard);
        
        // Phase 6: Cleanup
        await CleanupSourceDataAsync(sourceShard);
    }
}
```

## Performance Results and Business Impact

### Quantifiable Improvements

- **Query Performance**: 15-second queries → 200ms average
- **Concurrent Users**: 2,000 → 15,000+ supported
- **Uptime**: 99.9% → 99.99%
- **Backup Times**: 4 hours → 15 minutes per shard

### Cost Optimization

- Could use different hardware for different shards
- Hot shards on SSDs, cold shards on HDDs
- Better resource utilization

## Lessons Learned the Hard Way

**Mistake 1: Poor Shard Key Choice**

We initially sharded by user signup date, which created hot shards. Solution: Choose shard keys that distribute load evenly.

**Mistake 2: Underestimating Cross-Shard Complexity**

We didn't plan for cross-shard queries initially. Solution: Design for cross-shard operations from day one.

**Mistake 3: Manual Shard Management**

Manual shard splitting was error-prone. Solution: Automate shard management operations.

**Mistake 4: Lack of Monitoring**

We didn't notice unbalanced shards until performance suffered. Solution: Implement comprehensive shard monitoring.

## Your Sharding Readiness Assessment

### Good Candidates for Sharding

- Data naturally segments (geographic, temporal, customer-based)
- Hitting vertical scaling limits
- Clear shard key candidates available
- Team has distributed systems experience
- Cross-shard query requirements are minimal

### Sharding Alternatives to Consider First

- **Read Replicas**: For read-heavy workloads
- **Caching**: For frequently accessed data
- **Database Partitioning**: For logical separation within single database
- **Archiving**: For moving historical data to cold storage

## Implementation Roadmap

### Week 1-2: Planning and Design

- Analyze data access patterns
- Choose shard key strategy
- Design shard routing layer
- Plan cross-shard operations

### Week 3-4: Foundation

- Implement shard router
- Create shard management tools
- Set up monitoring
- Build migration utilities

### Week 5-8: Gradual Migration

- Start with least critical data
- Implement dual-write strategy
- Migrate data incrementally
- Monitor performance closely

### Week 9-12: Optimization

- Automate shard management
- Optimize cross-shard queries
- Implement auto-scaling
- Refine based on production usage

## The Bottom Line

Sharding transformed Voila Cabs from a system constantly fighting scalability limits to a platform ready for exponential growth. While it introduces complexity, the ability to scale horizontally is invaluable for high-traffic applications. Start with a clear strategy, implement incrementally, and always keep your specific business requirements front and center.
