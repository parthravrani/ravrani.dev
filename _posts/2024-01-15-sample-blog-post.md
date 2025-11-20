---
layout: post
title: "Getting Started with .NET Core Performance Optimization"
permalink: /blog/getting-started-with-dotnet-core-performance-optimization/
slug: "getting-started-with-dotnet-core-performance-optimization"
category: tutorial
tags: [.NET, Performance, Optimization, C#, ASP.NET Core]
date: 2024-01-15
read_time: 8
description: "Learn essential techniques to optimize your .NET Core applications for better performance and scalability."
---

## Introduction

I remember the first time I thought my .NET application was fast. Then we hit 500 concurrent users and everything fell apart. Response times went from 200ms to 8 seconds, the database started throwing timeouts, and our users were not happy. That painful experience taught me that performance optimization isn't optional—it's survival.

## Understanding Performance Metrics: What Actually Matters

Before diving into optimization techniques, let me share what I learned matters most in real production systems:

- **Response Time**: How quickly your API responds to requests (users notice anything over 500ms)
- **Throughput**: Number of requests processed per second (this is what breaks under load)
- **Memory Usage**: Efficient memory management (memory leaks will kill you slowly)
- **CPU Utilization**: Optimal CPU usage patterns (high CPU usually means inefficient code)

## Key Optimization Strategies That Actually Work

### 1. Use Async/Await Properly (Not Just Everywhere)

I see developers add async/await everywhere without understanding why. The key isn't just making methods async—it's about not blocking threads while waiting for I/O operations.

In Voila Cabs, our driver location service was originally synchronous. When we had hundreds of drivers updating their locations every few seconds, the entire thread pool got exhausted.

```csharp
// Before: Blocking threads
public IActionResult GetDriverLocation(int driverId)
{
    var location = _dbContext.Drivers.Find(driverId).Location; // Blocks!
    return Ok(location);
}

// After: Non-blocking
public async Task<IActionResult> GetDriverLocationAsync(int driverId)
{
    var driver = await _dbContext.Drivers.FindAsync(driverId); // Frees thread
    return Ok(driver?.Location);
}
```

The result? Same server could handle 5x more concurrent requests.

### 2. Implement Smart Caching

Caching seems simple until you do it wrong. I've seen teams cache everything and then wonder why their memory is exploding.

At Upvolt, we implemented a multi-layer caching strategy:
- **Redis** for frequently accessed data (user sessions, configuration)
- **In-memory cache** for static data (city lists, fare calculations)
- **Database cache** for complex queries (trip history)

```csharp
// Smart caching with expiration
var driver = await _cache.GetOrCreateAsync($"driver_{driverId}", 
    async entry => {
        entry.AbsoluteExpiration = TimeSpan.FromMinutes(5);
        return await _dbContext.Drivers.FindAsync(driverId);
    });
```

This reduced our database load by 60% and improved response times from 200ms to 20ms.

### 3. Optimize Database Queries (The Real Bottleneck)

Most performance issues I've seen come from the database. Here's what actually works:

- **Use compiled queries** for hot paths (we saw 30% improvement)
- **Implement pagination** (don't load 10,000 records at once)
- **Use appropriate indexes** (I've fixed 10-second queries with one index)
- **Avoid N+1 query problems** (this killed us at Voila Cabs initially)

### 4. Minimize Object Allocations

In high-traffic scenarios, object allocations matter. We reduced GC pressure significantly by:

- Reusing objects where possible
- Using object pooling for high-frequency allocations
- Preferring structs over classes for small data structures

### 5. Profile Your Application (Measure, Don't Guess)

Performance optimization without measurement is like driving blindfolded. I use:

- **PerfView** for CPU profiling (free and powerful)
- **dotMemory** for memory profiling (worth the cost)
- **Application Insights** for production monitoring (essential)

## Best Practices I Learned the Hard Way

1. **Measure First**: Always profile before optimizing. I've wasted weeks optimizing code that wasn't the bottleneck.
2. **Focus on Hot Paths**: Optimize code that runs frequently, not code that runs once.
3. **Use Benchmarking**: Validate improvements with benchmarks. Sometimes "optimizations" make things worse.
4. **Monitor Production**: Track performance metrics in production. Development performance doesn't always match production.

## The Bottom Line

Performance optimization is an ongoing process, not a one-time fix. Start with profiling, identify your actual bottlenecks, and apply targeted optimizations. Remember: premature optimization can be counterproductive, but ignoring performance until production breaks is worse. Always measure first, optimize second.

