---
layout: post
title: "Real-time Features in .NET: Beyond SignalR"
permalink: /blog/realtime-features-dotnet-beyond-signalr/
slug: "realtime-features-dotnet-beyond-signalr"
category: tutorial
tags: [.NET, SignalR, WebSockets, Real-time, gRPC, ASP.NET Core]
date: 2025-09-16
read_time: 19
description: "Explore real-time features in .NET beyond SignalR, including WebSockets, gRPC streaming, and Redis pub/sub for building scalable real-time systems handling 10,000+ concurrent connections."
---

## Introduction

Real-time features have evolved from 'nice-to-have' to 'must-have' in modern applications. Users expect live updates, collaborative editing, and instant notifications. While SignalR is the go-to solution for many .NET developers, the real-time landscape has expanded dramatically. At Voila Cabs, we needed real-time driver location updates for thousands of concurrent users. SignalR got us started, but we had to go beyond it to handle the scale. Let me show you how we built real-time systems handling 10,000+ concurrent connections and what we learned beyond the basics.

## SignalR: The Foundation

### Basic SignalR Setup

SignalR hubs are like chat rooms - clients connect and can send/receive messages. Here's a basic setup:

```csharp
public class NotificationHub : Hub
{
    // Clients call this method to join a group (like joining a chat room)
    public async Task JoinGroup(string groupName)
    {
        // Add this connection to a group
        // Now this client will receive messages sent to this group
        await Groups.AddToGroupAsync(Context.ConnectionId, groupName);
        // Context.ConnectionId is unique for each connected client
    }
    
    // Send a message to everyone in a group
    public async Task SendMessage(string groupName, string message)
    {
        // Send message to all clients in this group
        await Clients.Group(groupName).SendAsync("ReceiveMessage", message);
        // Clients receive this via their "ReceiveMessage" JavaScript handler
    }
    
    // Called automatically when a client connects
    public override async Task OnConnectedAsync()
    {
        await base.OnConnectedAsync();
        // Log that someone connected - useful for monitoring
        _logger.LogInformation("Client connected: {ConnectionId}", Context.ConnectionId);
    }
}
```

**How it works:** When a client connects, `OnConnectedAsync` fires. Clients can call `JoinGroup` to join groups (like "order-123" or "user-notifications"). When you call `SendMessage`, all clients in that group receive it instantly via WebSocket.

## Advanced SignalR Patterns

### Pattern 1: Connection Resilience with Reconnect

Real-world connections drop - network issues, mobile apps going to background, etc. We need to handle reconnections gracefully:

```csharp
public class ResilientHub : Hub
{
    public override async Task OnConnectedAsync()
    {
        // Store connection info in Redis so we can recover if server restarts
        // This is important for horizontal scaling - other servers need to know about connections
        var connectionInfo = new ConnectionInfo
        {
            ConnectionId = Context.ConnectionId,      // Unique ID for this connection
            UserId = Context.UserIdentifier,          // Which user is connected
            ConnectedAt = DateTime.UtcNow,            // When they connected
            Groups = new List<string>()                // Which groups they're in
        };
        
        // Store in Redis with 1-hour expiration
        // If connection drops, we can check Redis to see if they should reconnect
        await _distributedCache.SetAsync(
            $"connection:{Context.ConnectionId}",      // Key: connection:abc123
            connectionInfo,                           // Value: connection details
            new DistributedCacheEntryOptions { SlidingExpiration = TimeSpan.FromHours(1) });
            // Sliding expiration means: if accessed within 1 hour, extend expiration
            
        await base.OnConnectedAsync();
    }
    
    public override async Task OnDisconnectedAsync(Exception exception)
    {
        if (exception != null)
        {
            // Connection dropped due to error (not graceful disconnect)
            // Schedule logic to notify user to reconnect or auto-reconnect
            await ScheduleReconnectionAsync(Context.ConnectionId);
            // This might send them a notification or queue a reconnection attempt
        }
        
        await base.OnDisconnectedAsync(exception);
    }
}
```

**Why this matters:** Without this, if a connection drops, the server forgets about it. With Redis storage, even if the server restarts, we know who was connected and can help them reconnect seamlessly.

### Pattern 2: Message Batching for High Frequency Updates

When you're sending lots of updates (like stock prices or location updates), sending each one individually is inefficient. Batching groups multiple messages together:

```csharp
public class BatchedHub : Hub
{
    // Store batches in memory - key is batchId, value is list of messages
    private readonly ConcurrentDictionary<string, List<object>> _messageBuffers = new();
    // ConcurrentDictionary is thread-safe - multiple clients can add messages simultaneously
    
    // Client calls this to start a batch
    public async Task StartBatch(string batchId)
    {
        // Create a new buffer for this batch
        _messageBuffers[batchId] = new List<object>();
    }
    
    // Client calls this to add messages to the batch
    public async Task AddToBatch(string batchId, object message)
    {
        if (_messageBuffers.TryGetValue(batchId, out var buffer))
        {
            // Add message to buffer instead of sending immediately
            buffer.Add(message);
            
            // If buffer reaches 100 messages, send them all at once
            if (buffer.Count >= 100)
            {
                await FlushBatch(batchId);  // Send all 100 messages together
            }
        }
    }
    
    // Send all buffered messages at once
    private async Task FlushBatch(string batchId)
    {
        if (_messageBuffers.TryRemove(batchId, out var buffer))
        {
            // Send all messages in one call instead of 100 separate calls
            await Clients.Caller.SendAsync("BatchMessages", buffer);
            // Client receives one message with array of 100 updates
        }
    }
}
```

**Why batch:** Instead of sending 100 WebSocket messages (100 network round-trips), we send 1 message with 100 updates. This reduces network overhead and improves performance significantly. At Voila Cabs, we batched driver location updates - instead of 10 updates per second per driver, we sent 1 batch every second with all updates.

## Beyond SignalR: When You Need More

### Scenario 1: Massive Scale with Redis Backplane

When you have multiple servers, SignalR needs a way to communicate between them. Redis acts as a message bus:

```csharp
// SignalR with Redis for horizontal scaling
// This tells SignalR to use Redis to share messages between servers
services.AddSignalR()
    .AddStackExchangeRedis(redisConnectionString, options =>
    {
        options.Configuration.ChannelPrefix = "MyApp";  // Prefix for Redis channels
        // All SignalR messages go through Redis channels
    });

// How it works: Server A sends a message → Redis → Server B receives it
// This allows horizontal scaling - add more servers, they all stay in sync

// Custom Redis pub/sub for specialized scenarios
// Sometimes you need direct Redis pub/sub (not through SignalR)
public class RedisRealTimeService
{
    private readonly IConnectionMultiplexer _redis;  // Redis connection
    
    // Publish a message to a Redis channel
    public async Task PublishAsync(string channel, object message)
    {
        var subscriber = _redis.GetSubscriber();  // Get Redis pub/sub subscriber
        // Publish message to channel - all subscribers receive it
        await subscriber.PublishAsync(channel, JsonSerializer.Serialize(message));
        // Example: Publish to "driver-location-updates" channel
    }
    
    // Subscribe to a Redis channel and handle messages
    public async Task SubscribeAsync(string channel, Func<string, Task> handler)
    {
        var subscriber = _redis.GetSubscriber();
        // Subscribe to channel - when messages arrive, call the handler
        await subscriber.SubscribeAsync(channel, (redisChannel, value) =>
        {
            // This callback fires when a message is published to this channel
            handler(value);  // Process the message
        });
    }
}
```

**Why Redis backplane:** Without it, if Server A sends a message to a client connected to Server B, it won't work - servers don't know about each other's connections. Redis acts as a shared message bus so all servers can communicate.

### Scenario 2: WebSockets for Raw Performance

Sometimes SignalR is too high-level. For maximum performance, you can use raw WebSockets directly. This gives you full control but more complexity:

```csharp
public class RawWebSocketMiddleware
{
    private readonly RequestDelegate _next;
    
    // This middleware checks if request is a WebSocket request
    public async Task InvokeAsync(HttpContext context)
    {
        if (context.WebSockets.IsWebSocketRequest)
        {
            // It's a WebSocket request - accept it and handle it
            var webSocket = await context.WebSockets.AcceptWebSocketAsync();
            await HandleWebSocketConnection(webSocket);
        }
        else
        {
            // Not a WebSocket - pass to next middleware
            await _next(context);
        }
    }
    
    // Handle the WebSocket connection - this is the low-level part
    private async Task HandleWebSocketConnection(WebSocket webSocket)
    {
        // Buffer to receive messages (4KB buffer)
        var buffer = new byte[1024 * 4];
        
        try
        {
            // Wait for a message from client
            var result = await webSocket.ReceiveAsync(
                new ArraySegment<byte>(buffer), CancellationToken.None);
                
            // Keep receiving messages until client closes connection
            while (!result.CloseStatus.HasValue)
            {
                // Convert bytes to string
                var message = Encoding.UTF8.GetString(buffer, 0, result.Count);
                
                // Process the message (your custom logic here)
                await ProcessWebSocketMessage(webSocket, message);
                
                // Wait for next message
                result = await webSocket.ReceiveAsync(
                    new ArraySegment<byte>(buffer), CancellationToken.None);
            }
            
            // Client closed connection - close gracefully
            await webSocket.CloseAsync(result.CloseStatus.Value, 
                result.CloseStatusDescription, CancellationToken.None);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "WebSocket connection error");
        }
    }
}
```

**When to use raw WebSockets:** SignalR handles reconnection, groups, and message routing for you. Raw WebSockets give you control but you handle everything yourself. Use raw WebSockets when you need maximum performance and minimal overhead - like high-frequency trading or real-time gaming.

### Scenario 3: gRPC for Service-to-Service Real-time

gRPC is perfect for service-to-service communication. It's more efficient than REST and supports streaming:

```csharp
// Protobuf definition (defines the service contract)
// This says: "RealTimeService has a method that streams notifications"
service RealTimeService {
  rpc StreamNotifications (NotificationRequest) returns (stream NotificationResponse);
  //                                                      ^^^^^^ This means it streams multiple responses
}

// Server implementation - this runs on your backend service
public class RealTimeService : RealTimeServiceBase
{
    public override async Task StreamNotifications(
        NotificationRequest request,                    // Client sends: "Give me notifications for user X"
        IServerStreamWriter<NotificationResponse> responseStream,  // We write responses to this stream
        ServerCallContext context)
    {
        var userId = GetUserIdFromContext(context);  // Extract user ID from request
        
        // Keep streaming until client disconnects
        while (!context.CancellationToken.IsCancellationRequested)
        {
            // Get pending notifications for this user
            var notifications = await _notificationService.GetPendingNotificationsAsync(userId);
            
            // Send each notification to the client
            foreach (var notification in notifications)
            {
                await responseStream.WriteAsync(new NotificationResponse
                {
                    Id = notification.Id,
                    Type = notification.Type,
                    Message = notification.Message,
                    Timestamp = Timestamp.FromDateTime(notification.CreatedAt)
                });
                // Client receives this notification immediately via the stream
            }
            
            // Wait 1 second, then check for more notifications
            await Task.Delay(1000, context.CancellationToken);
        }
    }
}
```

**How it works:** Client calls `StreamNotifications` and gets a stream back. Server keeps the connection open and sends notifications as they arrive. This is more efficient than polling REST endpoints every second. The connection stays open, so notifications arrive instantly with minimal overhead.

## Real-time Architecture Patterns

### Pattern 1: Event Sourcing for Real-time State

```csharp
public class RealTimeOrderService
{
    public async Task HandleOrderUpdated(OrderUpdatedEvent @event)
    {
        // Update read model
        await _orderViewService.UpdateOrderAsync(@event.OrderId);
        
        // Notify connected clients
        await _notificationHub.Clients
            .Group($"order-{@event.OrderId}")
            .SendAsync("OrderUpdated", @event);
            
        // Update related dashboards
        await _dashboardService.RefreshOrderMetricsAsync(@event.OrderId);
    }
}
```

### Pattern 2: CQRS with Real-time Read Models

```csharp
public class RealTimeOrderViewService
{
    public async Task<OrderView> GetOrderWithLiveUpdates(int orderId)
    {
        // Get current state
        var order = await _orderRepository.GetOrderAsync(orderId);
        
        // Subscribe to real-time updates
        var updates = _messageBus.Subscribe<OrderUpdatedEvent>(
            $"order-{orderId}");
            
        return new OrderView
        {
            Order = order,
            UpdateStream = updates
        };
    }
}
```

### Pattern 3: Presence and Activity Tracking

```csharp
public class PresenceTracker
{
    private readonly ConcurrentDictionary<string, UserPresence> _onlineUsers = new();
    
    public Task UserConnected(string userId, string connectionId)
    {
        _onlineUsers.AddOrUpdate(userId, 
            new UserPresence 
            { 
                UserId = userId, 
                ConnectionIds = new HashSet<string> { connectionId },
                LastSeen = DateTime.UtcNow
            },
            (key, existing) =>
            {
                existing.ConnectionIds.Add(connectionId);
                existing.LastSeen = DateTime.UtcNow;
                return existing;
            });
            
        return Task.CompletedTask;
    }
    
    public Task<UserPresence[]> GetOnlineUsers()
    {
        return Task.FromResult(_onlineUsers.Values.ToArray());
    }
}
```

## Performance and Scaling Considerations

### Connection Management

```csharp
public class ConnectionManager
{
    private readonly IMemoryCache _cache;
    private readonly TimeSpan _connectionTimeout = TimeSpan.FromMinutes(5);
    
    public async Task<bool> IsConnectionAlive(string connectionId)
    {
        return _cache.TryGetValue($"connection:{connectionId}", out _);
    }
    
    public async Task RefreshConnection(string connectionId)
    {
        _cache.Set($"connection:{connectionId}", true, _connectionTimeout);
    }
    
    public async Task CleanupStaleConnections()
    {
        // Background task to remove stale connections
        // This prevents memory leaks in connection tracking
    }
}
```

### Message Throttling

```csharp
public class MessageThrottler
{
    private readonly ConcurrentDictionary<string, RateLimitInfo> _rateLimits = new();
    
    public bool ShouldThrottle(string connectionId, string messageType)
    {
        var key = $"{connectionId}:{messageType}";
        var now = DateTime.UtcNow;
        
        if (_rateLimits.TryGetValue(key, out var limit))
        {
            if (now - limit.LastMessage < TimeSpan.FromMilliseconds(100))
            {
                return true; // Too fast
            }
            
            if (limit.MessageCount > 1000 && now - limit.WindowStart < TimeSpan.FromMinutes(1))
            {
                return true; // Too many messages
            }
        }
        
        // Update rate limiting
        _rateLimits[key] = new RateLimitInfo
        {
            LastMessage = now,
            MessageCount = (limit?.MessageCount ?? 0) + 1,
            WindowStart = limit?.WindowStart ?? now
        };
        
        return false;
    }
}
```

## Real-world Implementation: Live Dashboard

### Case Study: Real-time Analytics Dashboard

```csharp
public class LiveDashboardHub : Hub
{
    private readonly IAnalyticsService _analytics;
    private readonly IDashboardCache _cache;
    
    public async Task SubscribeToMetrics(string dashboardId)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, dashboardId);
        
        // Send current state immediately
        var currentMetrics = await _cache.GetDashboardMetricsAsync(dashboardId);
        await Clients.Caller.SendAsync("MetricsUpdate", currentMetrics);
        
        // Start real-time updates
        _ = StartRealTimeUpdates(Context.ConnectionId, dashboardId);
    }
    
    private async Task StartRealTimeUpdates(string connectionId, string dashboardId)
    {
        while (true)
        {
            try
            {
                var updates = await _analytics.GetLiveUpdatesAsync(dashboardId);
                await Clients.Client(connectionId).SendAsync("LiveUpdate", updates);
                
                await Task.Delay(2000); // Update every 2 seconds
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Real-time update failed for {DashboardId}", dashboardId);
                break;
            }
        }
    }
}
```

## Testing Real-time Features

### Integration Testing

```csharp
public class SignalRIntegrationTests : IClassFixture<WebApplicationFactory<Startup>>
{
    [Fact]
    public async Task Can_Send_And_Receive_Messages()
    {
        // Arrange
        var connection = new HubConnectionBuilder()
            .WithUrl($"http://localhost/notificationHub", options =>
            {
                options.HttpMessageHandlerFactory = _ => _factory.Server.CreateHandler();
            })
            .Build();
            
        var receivedMessage = "";
        connection.On<string>("ReceiveMessage", message =>
        {
            receivedMessage = message;
        });
        
        // Act
        await connection.StartAsync();
        await connection.InvokeAsync("SendMessage", "test-group", "Hello World");
        
        // Assert
        await Task.Delay(1000); // Wait for message
        Assert.Equal("Hello World", receivedMessage);
    }
}
```

## The Real-time Feature Checklist

- Choose the right technology for your scale (SignalR, WebSockets, gRPC)
- Implement connection resilience and reconnection logic
- Add rate limiting and message throttling
- Use distributed caching for connection state
- Implement proper error handling and logging
- Consider security (authentication, authorization)
- Plan for horizontal scaling
- Add monitoring and health checks
- Implement graceful degradation
- Test under load with realistic scenarios

## The Bottom Line

Real-time features are no longer optional in modern applications. While SignalR provides an excellent foundation, understanding when and how to go beyond it is crucial for building scalable, performant real-time systems. The key is matching the technology to your specific requirements - whether it's massive scale with Redis, raw performance with WebSockets, or efficient service communication with gRPC. Start with SignalR, but be prepared to evolve your architecture as your real-time needs grow. We started with SignalR at Voila Cabs, and when we hit the limits, we added Redis backplane and custom WebSocket handlers. The system that handles 10,000+ connections today looks very different from where we started.

