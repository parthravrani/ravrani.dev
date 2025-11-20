---
layout: post
title: ".NET API Design: Building APIs That Don't Break"
permalink: /blog/dotnet-api-design-building-apis-that-dont-break/
slug: "dotnet-api-design-building-apis-that-dont-break"
category: tutorial
tags: [.NET, API Design, REST, ASP.NET Core, Best Practices]
date: 2025-09-08
read_time: 14
description: "Learn how to design .NET APIs that maintain backward compatibility and don't break client applications, based on real-world experience from Codzgarage."
---

## Introduction

APIs are the promises your application makes to other systems. Break those promises, and you break trust. I learned this the hard way when a simple API change at Codzgarage caused mobile apps to crash for thousands of users. It was 2 AM, support tickets were flooding in, and I was frantically trying to figure out what went wrong. That painful experience taught me that good API design isn't about being clever - it's about being reliable, predictable, and respectful of your consumers.

## The Foundation: Designing for Longevity

### Principle 1: Version from Day One

Even if you're building version 1, design as if version 2 is inevitable. We implemented this in Upvolt from the beginning:

```csharp
// URL-based versioning
/api/v1/users
/api/v2/users

// Header-based versioning
Accept: application/vnd.ourcompany.v1+json
```

**Why This Matters:**

- **Backward Compatibility**: You can evolve without breaking existing clients
- **Clear Communication**: Consumers know exactly what they're getting
- **Gradual Migration**: Clients can upgrade at their own pace

**Our Versioning Strategy:**

- Major versions in URL (v1, v2)
- Minor versions in headers or query parameters
- Deprecation notices with 6-month migration periods

### Principle 2: Consistent Response Patterns

Consistency reduces cognitive load. Every API response follows the same structure, so clients always know what to expect. Here's the wrapper class we use:

```csharp
// This generic wrapper ensures every API response has the same structure
public class ApiResponse<T>
{
    public bool Success { get; set; }        // Did the request succeed?
    public T Data { get; set; }              // The actual data (user, order, etc.)
    public string Message { get; set; }      // Human-readable message
    public List<ApiError> Errors { get; set; } // List of errors (if any)
    public PaginationInfo Pagination { get; set; } // Pagination info (if applicable)
}
```

**Success Response Example:**
When everything works, clients get this structure:
```json
{
    "success": true,
    "data": { 
        "id": 123,
        "name": "John Doe",
        "email": "john@example.com"
    },
    "message": "User created successfully",
    "errors": null,
    "pagination": null
}
```

**Error Response Example:**
When something goes wrong, same structure but with error details:
```json
{
    "success": false,
    "data": null,
    "message": "Validation failed",
    "errors": [
        {
            "code": "VALIDATION_ERROR",
            "message": "Email is required",
            "field": "email"
        }
    ],
    "pagination": null
}
```

**Why this matters:** Clients can write one piece of code to handle all responses. They check `success`, if true use `data`, if false check `errors`. No guessing about response structure.

### Principle 3: Thoughtful Error Handling

Good error messages turn frustration into understanding. We categorize errors:

**Client Errors (4xx):**

- **400 Bad Request**: Validation errors, malformed requests
- **401 Unauthorized**: Authentication required
- **403 Forbidden**: Insufficient permissions
- **404 Not Found**: Resource doesn't exist
- **409 Conflict**: Business rule violation

**Server Errors (5xx):**

- **500 Internal Server Error**: Unexpected server issues
- **503 Service Unavailable**: Temporary unavailability

## Advanced API Patterns That Saved Us

### Pattern 1: The HATEOAS Approach

Hypermedia as the Engine of Application State makes your API discoverable. Instead of clients hardcoding URLs, the API tells them what actions are available. Here's how we implement it:

```csharp
// The resource includes links to available actions
public class UserResource
{
    public int Id { get; set; }
    public string Name { get; set; }
    public string Email { get; set; }
    public List<ApiLink> Links { get; set; } // Links to available actions
}

// When you return a user, you include what they can do with it
{
    "id": 123,
    "name": "John Doe",
    "email": "john@example.com",
    "links": [
        {
            "rel": "self",                    // Link to this resource
            "href": "/api/v1/users/123",
            "method": "GET"
        },
        {
            "rel": "update",                  // Link to update this user
            "href": "/api/v1/users/123",
            "method": "PUT"
        },
        {
            "rel": "delete",                  // Link to delete this user
            "href": "/api/v1/users/123",
            "method": "DELETE"
        }
    ]
}
```

**How clients use this:** Instead of hardcoding `/api/v1/users/123` everywhere, clients look for the link with `rel="update"` and use that URL. If you change the URL structure later, clients automatically get the new URLs.

**Benefits:**

- Clients don't need to hardcode URLs - they discover them from responses
- API evolution becomes easier - change URLs without breaking clients
- Self-documenting behavior - clients know what actions are available

### Pattern 2: Bulk Operations

Single requests for multiple operations dramatically improve performance. Instead of making 100 API calls to create 100 users, make one call with 100 operations. Here's how:

**Request:**
```csharp
// Instead of 100 separate POST requests, send one bulk request
POST /api/v1/users/bulk
{
    "operations": [
        {
            "type": "create",                    // What operation to perform
            "data": { "name": "User 1", "email": "user1@test.com" }
        },
        {
            "type": "create", 
            "data": { "name": "User 2", "email": "user2@test.com" }
        }
        // ... 98 more operations
    ]
}
```

**Response:**
The API processes all operations and returns individual results for each:
```json
{
    "success": true,
    "data": {
        "processed": 2,        // Total operations attempted
        "succeeded": 2,        // How many succeeded
        "failed": 0,           // How many failed
        "results": [
            {
                "operation": "create",
                "success": true,
                "id": 123,                      // ID of created user
                "message": "User created successfully"
            },
            {
                "operation": "create",
                "success": true, 
                "id": 124,
                "message": "User created successfully"
            }
        ]
    }
}
```

**Why this helps:** One network round-trip instead of 100. One database transaction instead of 100. Much faster and more efficient. If some operations fail, you get details about which ones failed and why.

### Pattern 3: Partial Responses and Field Selection

Let clients request only the data they need:

```csharp
// Request specific fields
GET /api/v1/users/123?fields=id,name,email

// Response only includes requested fields
{
    "id": 123,
    "name": "John Doe", 
    "email": "john@example.com"
}

// Implementation
public async Task<IActionResult> GetUser(int id, [FromQuery] string fields = null)
{
    var user = await _userService.GetUserAsync(id);
    var result = _fieldSelector.SelectFields(user, fields);
    return Ok(result);
}
```

## API Security: Beyond Basic Authentication

### Our Multi-Layer Security Approach

**1. Authentication:**

```csharp
// JWT-based authentication with refresh tokens
services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            // ... other configurations
        };
    });
```

**2. Rate Limiting:**

We implemented sliding window rate limiting:

```csharp
public class RateLimitingMiddleware
{
    public async Task InvokeAsync(HttpContext context)
    {
        var clientId = GetClientId(context);
        var endpoint = context.Request.Path;
        
        var isAllowed = await _rateLimitService.IsAllowedAsync(
            clientId, endpoint, TimeSpan.FromMinutes(1), 100);
            
        if (!isAllowed)
        {
            context.Response.StatusCode = 429;
            await context.Response.WriteAsync("Rate limit exceeded");
            return;
        }
        
        await _next(context);
    }
}
```

**3. Input Validation:**

Never trust client input. We use FluentValidation:

```csharp
public class CreateUserRequestValidator : AbstractValidator<CreateUserRequest>
{
    public CreateUserRequestValidator()
    {
        RuleFor(x => x.Email)
            .NotEmpty().WithMessage("Email is required")
            .EmailAddress().WithMessage("Valid email is required");
            
        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("Name is required")
            .MaximumLength(100).WithMessage("Name cannot exceed 100 characters");
    }
}
```

## API Documentation That Actually Gets Used

### Our Documentation Stack

- **Swagger/OpenAPI**: Machine-readable API specification
- **Redoc**: Beautiful, interactive documentation
- **Postman Collections**: Ready-to-use testing setup
- **Code Examples**: C#, JavaScript, Python examples for every endpoint

### Making Documentation Maintainable

```csharp
// XML comments become API documentation
/// <summary>
/// Creates a new user in the system
/// </summary>
/// <param name="request">User creation details</param>
/// <returns>The newly created user</returns>
/// <response code="201">Returns the newly created user</response>
/// <response code="400">If the request is invalid</response>
[HttpPost]
[ProducesResponseType(typeof(UserResource), 201)]
[ProducesResponseType(typeof(ApiError), 400)]
public async Task<IActionResult> CreateUser([FromBody] CreateUserRequest request)
{
    // Implementation
}
```

## Testing Strategies That Catch Breaking Changes

### Our Testing Pyramid

- **Unit Tests**: Business logic and validation (70%)
- **Integration Tests**: Database and external service interactions (20%)
- **Contract Tests**: API compatibility between services (10%)

### Contract Testing Example

```csharp
[Test]
public void UserApi_Should_Maintain_Response_Contract()
{
    // Arrange
    var expectedProperties = new[]
    {
        "id", "name", "email", "createdAt", "links"
    };
    
    // Act
    var response = _client.GetAsync("/api/v1/users/1").Result;
    var content = response.Content.ReadAsStringAsync().Result;
    var json = JObject.Parse(content);
    
    // Assert
    foreach (var property in expectedProperties)
    {
        json["data"].SelectToken(property).Should().NotBeNull();
    }
}
```

## Monitoring and Analytics

### What We Track

- **Response Times**: 95th and 99th percentiles
- **Error Rates**: By endpoint and error type
- **Usage Patterns**: Most used endpoints, peak times
- **Deprecation Usage**: Who's still using deprecated features

### Our Monitoring Setup

```csharp
public class ApiMetricsMiddleware
{
    public async Task InvokeAsync(HttpContext context)
    {
        var stopwatch = Stopwatch.StartNew();
        
        try
        {
            await _next(context);
            
            _metrics.Increment("api.requests", new[]
            {
                ("endpoint", context.Request.Path),
                ("method", context.Request.Method),
                ("status", context.Response.StatusCode.ToString())
            });
        }
        finally
        {
            stopwatch.Stop();
            _metrics.Timing("api.response_time", stopwatch.ElapsedMilliseconds);
        }
    }
}
```

## The Evolution Strategy: Changing APIs Safely

### Our API Change Process

- **Add, Don't Change**: New fields instead of modifying existing ones
- **Deprecate Gracefully**: 6-month deprecation period with warnings
- **Version Strategically**: Major versions for breaking changes
- **Communicate Proactively**: Email, documentation updates, API responses

### Deprecation Headers

```
API-Deprecated: true
API-Deprecation-Date: 2025-06-30
API-Deprecation-Info: https://api.ourcompany.com/deprecations/v1
```

## Lessons from Production Incidents (Learn from My Mistakes)

**Incident 1: The Required Field That Broke Mobile Apps**

We added a required field without versioning. Mobile apps couldn't update. I spent 4 hours rolling back and fixing this. Solution: Make new fields optional initially, then required in next version. Always version your changes.

**Incident 2: The Enum That Stopped Working**

We added values to an enum, but some clients couldn't handle unknown values. The mobile team wasn't happy. Solution: Design enums to be forward-compatible. Always include an "Unknown" value that clients can safely ignore.

**Incident 3: The Pagination Change**

We changed pagination behavior, breaking client assumptions. Reports started showing wrong data. Solution: Never change existing behavior - add new endpoints instead. Deprecate the old ones gracefully.

## Your API Design Checklist

- Versioning strategy in place
- Consistent response format
- Comprehensive error handling
- Input validation on all endpoints
- Rate limiting implemented
- Authentication and authorization
- Documentation generated and maintained
- Monitoring and analytics setup
- Testing strategy for breaking changes
- Deprecation policy defined

## The Bottom Line

Good API design is an ongoing commitment to your consumers. It's about building trust through reliability and clear communication. The extra effort you put into thoughtful design pays back many times over in reduced support burden and happier integration partners. After that 2 AM incident, I never took API design lightly again. Your future self (and your users) will thank you.

