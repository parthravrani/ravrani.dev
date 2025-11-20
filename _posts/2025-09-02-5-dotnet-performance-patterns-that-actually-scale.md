---
layout: post
title: "5 .NET Performance Patterns That Actually Scale"
permalink: /blog/5-dotnet-performance-patterns-that-actually-scale/
slug: "5-dotnet-performance-patterns-that-actually-scale"
category: tutorial
tags: [.NET, Performance, Optimization, C#, ASP.NET Core, Scalability]
date: 2025-09-02
read_time: 15
description: "Battle-tested .NET performance patterns from real production applications like Voila Cabs and Upvolt that actually handle thousands of concurrent users."
---

## Introduction

Performance optimization can feel like searching for a needle in a haystack. You tweak a line here, adjust a setting there, and hope for the best. But after scaling multiple .NET applications to handle thousands of concurrent users, I've discovered patterns that deliver real results every single time. These aren't theoretical concepts - they're battle-tested strategies from applications like Voila Cabs and Upvolt that actually handle production loads.

## Pattern 1: Strategic Caching - The Art of Remembering

### The Problem

In Voila Cabs, we noticed our driver location service was hitting the database for every location update. At peak hours, this meant thousands of queries per minute for data that changed every few seconds.

### The Solution

We implemented a multi-layer caching strategy:

- **Redis for frequently accessed data**: Driver locations, user sessions, configuration settings
- **In-memory cache for static data**: City lists, fare calculations, vehicle types
- **Database cache for complex queries**: Trip history, driver ratings

### The Implementation

Here's how we implemented the caching pattern. The key is using `GetOrCreateAsync` which checks the cache first, and only hits the database if the data isn't cached or has expired:

```csharp
// Instead of hitting the database every time (slow and expensive)
var driver = await _dbContext.Drivers.FindAsync(driverId);

// We cached with expiration - this checks cache first, then database
var driver = await _cache.GetOrCreateAsync($"driver_{driverId}", 
    async entry => {
        // Set cache expiration to 5 minutes
        // This means driver data is fresh for 5 minutes, then refreshed
        entry.AbsoluteExpiration = TimeSpan.FromMinutes(5);
        // Only called if cache miss - this is the expensive database call
        return await _dbContext.Drivers.FindAsync(driverId);
    });
```

**What's happening here:** The `GetOrCreateAsync` method first checks if we have a cached value for this driver. If yes, it returns immediately (super fast). If no, it executes the lambda function (the database call), stores the result in cache with a 5-minute expiration, and returns it. Next time someone requests the same driver within 5 minutes, it comes from cache instead of the database.

### The Result

- Database load reduced by 60%
- Response times improved from 200ms to 20ms
- System could handle 3x more concurrent users

## Pattern 2: Asynchronous Programming - Doing More with Less

### The Common Mistake

Many developers add async/await everywhere without understanding the why. The key isn't just making methods async - it's about not blocking threads while waiting for I/O operations.

### The Right Way

In Upvolt, our file processing service was originally synchronous. When users uploaded large Excel files, the entire thread was blocked until processing completed.

### The Fix

The problem with synchronous code is that it blocks threads while waiting for I/O operations (like reading files or writing to databases). Here's the transformation:

```csharp
// Before: Blocking thread - the thread sits idle waiting for I/O
public void ProcessFile(byte[] fileData) {
    var data = ParseExcelFile(fileData); // Thread blocked here, can't handle other requests
    SaveToDatabase(data); // Thread blocked here too
}

// After: Non-blocking - thread freed to handle other requests
public async Task ProcessFileAsync(byte[] fileData) {
    // When we hit await, the thread is freed to handle other requests
    // The I/O operation happens in the background
    var data = await ParseExcelFileAsync(fileData); // Thread freed, I/O happens async
    await SaveToDatabaseAsync(data); // Thread freed again, database write happens async
}
```

**Why this matters:** In the synchronous version, if you have 100 threads and 100 file uploads, all threads are blocked waiting. With async, those threads can handle other requests while waiting for I/O. This is why async can handle 5x more concurrent operations with the same resources.

### The Impact

- Same server could handle 5x more concurrent file uploads
- No more thread pool exhaustion errors
- Better responsiveness during peak loads

## Pattern 3: Database Connection Management - The Pool Party

### The Issue

Every new database connection has overhead. Creating and destroying connections for every request is like building a new road for every car trip.

### The Solution

.NET's connection pooling is fantastic, but you need to use it correctly. Connection pooling means .NET keeps a pool of database connections ready to reuse, so you don't pay the cost of creating new connections every time.

- **Let ADO.NET handle pooling**: Don't implement your own - .NET does this automatically
- **Open connections late, close them early**: Here's the pattern that works:

```csharp
// Good pattern - connection is opened just before use, closed immediately after
using (var connection = new SqlConnection(connectionString)) {
    // Connection is created (or retrieved from pool)
    await connection.OpenAsync();
    // Do your database work here - queries, inserts, etc.
    // Keep this section fast - don't do heavy processing while connection is open
} // Connection automatically returns to pool when 'using' block ends
```

**What's happening:** The `using` statement ensures the connection is properly disposed (returned to the pool) even if an exception occurs. The connection pool keeps these connections alive and ready for the next request, avoiding the expensive connection creation overhead.

- **Monitor your pool size**: Use tools like Application Insights to watch for connection pool exhaustion - if you see this, you're opening too many connections simultaneously

## Pattern 4: Lazy Loading - The Just-in-Time Approach

### When to Use It

Not all data needs to be loaded immediately. In The Classy Home's inventory system, we were loading supplier details, pricing history, and stock levels for every product - even when the user just wanted to browse.

### The Implementation

Lazy loading means we don't load data until it's actually needed. Here's how we implemented it:

```csharp
public class ProductService {
    // Lazy<Task<T>> means: "Don't load this until someone asks for it"
    // The Task part means it's async, so we can load it asynchronously when needed
    private readonly Lazy<Task<List<Supplier>>> _suppliers;
    
    public ProductService() {
        // Initialize the lazy loader - but don't execute it yet
        _suppliers = new Lazy<Task<List<Supplier>>>(async () => {
            // This lambda only runs when _suppliers.Value is first accessed
            return await LoadSuppliersAsync();
        });
    }
    
    public async Task<Product> GetProductAsync(int id) {
        // Load the product immediately - this is what we always need
        var product = await _dbContext.Products.FindAsync(id);
        
        // Suppliers loaded only when accessed - if caller doesn't need suppliers,
        // we never hit the database for them
        product.Suppliers = await _suppliers.Value;
        return product;
    }
}
```

**How this works:** When `GetProductAsync` is called, we load the product immediately. But suppliers are only loaded if someone actually accesses `_suppliers.Value`. If the caller just needs product name and price, we skip the expensive supplier query entirely. The first time someone accesses suppliers, the lambda runs and loads them. Subsequent accesses use the cached result.

### The Benefit

- Initial page load time reduced by 40%
- Memory usage decreased significantly
- Better user experience for common operations

## Pattern 5: Monitoring and Measurement - You Can't Improve What You Can't Measure

### The Reality

Performance optimization without measurement is like driving with your eyes closed. You might be going fast, but you don't know where you're headed.

### Our Monitoring Stack

- **Application Insights**: For application-level metrics
- **SQL Server Profiler**: For database performance
- **Redis CLI monitoring**: For cache effectiveness
- **Custom health checks**: For business-specific metrics

### Key Metrics We Track

- Response time percentiles (95th and 99th)
- Error rates and types
- Database query performance
- Memory and CPU usage patterns
- Cache hit ratios

### The Process

1. Measure baseline performance
2. Implement one change at a time
3. Measure the impact
4. Keep what works, revert what doesn't

## Putting It All Together

These patterns aren't magic bullets - they're tools in your toolbox. The key is understanding when and why to use each one. Start with measurement, make incremental changes, and always validate with real-world testing.

## Your Action Plan

1. Set up basic monitoring on your application
2. Identify your biggest performance bottleneck
3. Apply the most relevant pattern
4. Measure the improvement
5. Repeat

