---
layout: post
title: "CQRS in .NET: Beyond Basic CRUD"
permalink: /blog/cqrs-in-dotnet-beyond-basic-crud/
slug: "cqrs-in-dotnet-beyond-basic-crud"
category: tutorial
tags: [.NET, CQRS, Architecture, ASP.NET Core, Design Patterns]
date: 2025-09-04
read_time: 16
description: "Learn how CQRS (Command Query Responsibility Segregation) transformed Upvolt's performance by separating read and write operations, with practical .NET implementation examples."
---

## Introduction

CRUD operations are comfortable, like making toast. You put bread in, you get toast out. Simple. Predictable. But what happens when you need to run a restaurant kitchen serving hundreds of different dishes to thousands of customers? That's where CQRS (Command Query Responsibility Segregation) comes in, and it transformed how we built Upvolt.

## The Problem That Led Us to CQRS

### The Reporting Nightmare

In Upvolt's early days, our reporting dashboard was killing our application performance. Every time a manager ran a complex report showing field team performance across multiple regions, the entire system slowed to a crawl. Users trying to update their daily work reports would timeout, and our customer support phones would light up.

### The Root Cause

We had a single database model trying to do everything:

- **Optimized for transactions**: Quick updates to individual records
- **But also used for analytics**: Complex joins across multiple tables
- **And for real-time dashboards**: Aggregations and calculations

It was like using a sports car to haul construction materials - wrong tool for the job.

## Understanding CQRS: It's Simpler Than It Sounds

### The Basic Idea

Separate your read operations (queries) from your write operations (commands). Instead of one model to rule them all, you have:

- **Command Side**: For changing data (create, update, delete)
- **Query Side**: For reading data (reports, dashboards, lookups)

### Why This Matters:

- **Performance**: Each side can be optimized for its specific purpose
- **Scalability**: Scale reads and writes independently
- **Maintainability**: Changes to reporting don't affect core business operations
- **Team Organization**: Different teams can own different sides

## Our CQRS Implementation Journey

### Step 1: Starting Small with Separated Models

We didn't rewrite everything overnight. We started with the most problematic area - reporting. The key insight is that the data structure you need for writing (creating/updating work orders) is different from what you need for reading (showing reports).

Here's the difference:

```csharp
// Command model - optimized for writes
// This is what we use when creating or updating a work order
// It's normalized (follows database best practices) and includes only what's needed for business operations
public class WorkOrder
{
    public int Id { get; set; }
    public string Description { get; set; }
    public DateTime CreatedDate { get; set; }
    // Only fields needed for business operations
    // Notice: No TeamName here - that would come from a join with Team table
}

// Query model - optimized for reads
// This is what we use when displaying work orders in reports
// It's denormalized (includes data from multiple tables) for fast reads
public class WorkOrderSummary
{
    public int Id { get; set; }
    public string Description { get; set; }
    public string TeamName { get; set; } // Denormalized - no join needed!
    public decimal TotalHours { get; set; } // Pre-calculated - no aggregation needed!
    public string Status { get; set; }
    // Denormalized data for fast reads - everything you need is already here
}
```

**Why this matters:** When you write a work order, you don't need TeamName - you just need the TeamId. But when you read it for a report, you want TeamName already there so you don't have to join tables. The command model is optimized for writes (normalized, fast inserts), while the query model is optimized for reads (denormalized, fast queries).

### Step 2: Event Sourcing for Consistency

To keep our command and query models in sync, we used event sourcing. The idea is simple: when something happens (like a work order is created), we publish an event. Both the command side and query side listen to this event and update their respective databases.

Here's how it works:

```csharp
// First, we define what happened - this is the event
public class WorkOrderCreatedEvent
{
    public int WorkOrderId { get; set; }
    public string Description { get; set; }
    public int TeamId { get; set; }
    public DateTime CreatedDate { get; set; }
}

// Command side handler - updates the write-optimized database
// This is where the "source of truth" lives
public async Task Handle(WorkOrderCreatedEvent @event)
{
    // Update command database - this is the normalized, write-optimized store
    await _commandDb.WorkOrders.AddAsync(new WorkOrder { 
        Id = @event.WorkOrderId,
        Description = @event.Description,
        CreatedDate = @event.CreatedDate
        // Note: We store TeamId, not TeamName (normalized)
    });
}

// Query side handler - updates the read-optimized database
// This is where we denormalize for fast reads
public async Task Handle(WorkOrderCreatedEvent @event)
{
    // Update read-optimized view - this is the denormalized, read-optimized store
    // We fetch TeamName from Team table and include it here
    var team = await _commandDb.Teams.FindAsync(@event.TeamId);
    await _queryDb.WorkOrderSummaries.AddAsync(new WorkOrderSummary { 
        Id = @event.WorkOrderId,
        Description = @event.Description,
        TeamName = team.Name, // Denormalized - includes TeamName for fast reads
        TotalHours = 0, // Will be calculated as work progresses
        Status = "New"
    });
}
```

**How this keeps things in sync:** When a work order is created, we publish one event. Two handlers process it: one updates the command database (normalized), one updates the query database (denormalized). Both stay in sync because they're both reacting to the same event. If we need to add a new read model later, we just add another handler - no need to change existing code.

### Step 3: Different Databases for Different Jobs

We took it a step further by using different database technologies:

- **Command Store**: SQL Server for ACID compliance and data integrity
- **Query Store**: MongoDB for flexible schema and fast aggregations
- **Cache Layer**: Redis for frequently accessed data

**The Architecture That Emerged:**

```
User Action → Command → Event → [Command DB]
                              → [Query DB Update]
                              → [Cache Update]
                              → [Email Notification]
                              → [Analytics]
```

## Real-World Results from Upvolt

### Performance Impact:

- **Report generation**: 30 seconds → 3 seconds
- **Data entry operations**: 2 seconds → 200ms
- **System capacity**: Could handle 5x more concurrent users

### Development Impact:

- **Team autonomy**: Reporting team could innovate without affecting core operations
- **Feature velocity**: New features could be added to query side without touching command logic
- **Debugging**: Became easier with clear separation of concerns

### Business Impact:

- **Better insights**: Managers got richer, more real-time insights
- **No slowdowns**: Field teams experienced no slowdown during peak reporting hours
- **New capabilities**: We could offer new analytics features to customers

## When CQRS Makes Sense (And When It Doesn't)

### Good Candidates for CQRS:

- **Complex business logic**: Applications with intricate business rules
- **Rich reporting**: Systems requiring extensive analytics and dashboards
- **Different scaling needs**: Applications with different read vs write scalability requirements
- **Team scaling**: Teams that want to scale development efforts independently

### Poor Candidates for CQRS:

- **Simple CRUD**: Basic create-read-update-delete applications
- **Strong consistency required**: Systems where eventual consistency is unacceptable
- **Limited experience**: Teams without experience in distributed systems
- **Tight deadlines**: Projects with limited time and resources

## Our Implementation Mistakes (Learn from Our Pain)

- **Over-engineering Early**: We started with too much complexity. Start simple.
- **Event Versioning**: We didn't plan for event schema changes. Always version your events.
- **Monitoring Gap**: Initially, we didn't have good visibility into event processing.
- **Team Learning Curve**: It took time for the team to think in terms of commands and queries.

## Getting Started with CQRS: A Practical Approach

- **Week 1-2: Identify One Bounded Context** - Pick one area of your application where reads and writes have different requirements. For us, it was the reporting module.
- **Week 3-4: Implement Basic Separation** - Create separate models for commands and queries without changing your database.
- **Week 5-8: Add Event Sourcing** - Introduce events to keep everything in sync, starting with the most critical flows.
- **Week 9-12: Optimize and Scale** - Consider different databases, caching strategies, and deployment approaches.

## Tools That Helped Us

- **MediatR**: For handling commands and events
- **Entity Framework Core**: For command-side data access
- **MongoDB.Driver**: For query-side data access
- **Redis**: For caching
- **Seq**: For event logging and monitoring

## The Bottom Line

CQRS isn't about being clever - it's about being practical. It helped us build a system that could scale with our business needs while maintaining development velocity. Start small, learn as you go, and focus on solving real business problems rather than implementing patterns for their own sake.

