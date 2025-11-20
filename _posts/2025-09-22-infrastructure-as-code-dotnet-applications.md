---
layout: post
title: "Infrastructure as Code for .NET Applications"
permalink: /blog/infrastructure-as-code-dotnet-applications/
slug: "infrastructure-as-code-dotnet-applications"
category: tutorial
tags: [.NET, Infrastructure as Code, Terraform, DevOps, Cloud, Azure]
date: 2025-09-22
read_time: 21
description: "Master Infrastructure as Code for .NET applications using Terraform, learning environment factories, zero-downtime deployments, security-first infrastructure, and compliance as code."
---

## Introduction

Infrastructure as Code is like version control for your cloud environment—it transforms your infrastructure from a fragile, hand-crafted snowflake into a reproducible, testable, and version-controlled asset. I've seen teams go from 'it works in production but breaks in staging' to 'it works exactly the same everywhere' by treating infrastructure like software. At Codzgarage, we went from 2-week environment setup processes to 20-minute automated creation. That transformation didn't just save time—it changed how we worked.

## The Infrastructure Evolution Journey

### From ClickOps to CodeOps

Most teams start their cloud journey in the console, clicking buttons to create resources. This works until you need to recreate environments, track changes, or scale across teams:

```hcl
# The old way: Manual console configuration
# - 3 hours clicking in Azure portal
# - No record of what was changed
# - Different configurations in each environment
# - "It worked on my subscription" syndrome

# The new way: Infrastructure as Code
resource "azurerm_app_service_plan" "main" {
  name                = "asp-myapp-${var.environment}"
  location            = azurerm_resource_group.main.location
  kind                = "Windows"
  
  sku {
    tier = var.environment == "production" ? "Standard" : "Basic"
    size = var.environment == "production" ? "S2" : "B1"
  }
  
  tags = {
    Environment = var.environment
    Project     = "MyDotNetApp"
    ManagedBy   = "Terraform"
  }
}
```

## The Three Pillars of Effective IaC

1. **Reproducibility** - Create identical environments on demand
2. **Auditability** - Track every change with full history
3. **Testability** - Validate infrastructure before deployment

## Real-World Transformation: Healthcare Platform Case Study

A healthcare company was struggling with:

- 2-week environment setup process
- Inconsistent configurations causing patient data issues
- Compliance violations from manual changes
- 40% of developer time spent on environment issues

### The Solution: Terraform-Driven Infrastructure

```hcl
# environments/production/main.tf
module "web_app" {
  source = "../../modules/app_service"
  
  app_name     = "patientportal"
  environment  = "production"
  dotnet_version = "8.0"
  
  # Compliance requirements
  enable_backup      = true
  backup_retention   = 35  # HIPAA requirement
  enable_monitoring  = true
  security_alerts    = true
}

module "database" {
  source = "../../modules/sql_database"
  
  app_name    = "patientportal"
  environment = "production"
  
  # Data protection
  enable_tde          = true  # Transparent Data Encryption
  threat_detection    = true
  audit_logging       = true
  backup_retention    = 35
}

# Network security - HIPAA compliance
module "network" {
  source = "../../modules/network"
  
  app_name    = "patientportal"
  environment = "production"
  
  allowed_ips = [
    "192.168.1.0/24",  # Corporate office
    "10.0.0.0/16",     # VPN range
  ]
  
  deny_public_access = true
}
```

### The Results Were Transformational

- **Environment setup**: 2 weeks → 20 minutes
- **Compliance violations**: 12 per quarter → 0
- **Developer time on infrastructure**: 40% → 5%
- **Production incidents**: 15 per month → 2

## Advanced IaC Patterns for .NET Applications

### 1. Environment Factory Pattern

Create consistent environments across development, staging, and production:

```hcl
# modules/environment_factory/variables.tf
variable "app_name" {
  description = "Application name"
  type        = string
}

variable "environment" {
  description = "Environment (dev, staging, production)"
  type        = string
  validation {
    condition     = contains(["dev", "staging", "production"], var.environment)
    error_message = "Environment must be dev, staging, or production."
  }
}

variable "dotnet_version" {
  description = ".NET version for the application"
  type        = string
  default     = "8.0"
}

# modules/environment_factory/main.tf
resource "azurerm_resource_group" "main" {
  name     = "rg-${var.app_name}-${var.environment}"
  location = var.location
  
  tags = {
    Environment = var.environment
    Project     = var.app_name
    ManagedBy   = "Terraform"
  }
}

module "app_service" {
  source = "../app_service"
  
  app_name       = var.app_name
  environment    = var.environment
  dotnet_version = var.dotnet_version
  resource_group = azurerm_resource_group.main.name
  location       = azurerm_resource_group.main.location
}

module "database" {
  source = "../sql_database"
  
  app_name       = var.app_name
  environment    = var.environment
  resource_group = azurerm_resource_group.main.name
  location       = azurerm_resource_group.main.location
}
```

### 2. Zero-Downtime Deployment Strategy

```hcl
# Blue-green deployment with App Service slots
resource "azurerm_app_service_slot" "staging" {
  name                = "staging"
  app_service_name    = azurerm_app_service.main.name
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  
  site_config {
    dotnet_framework_version = "v${var.dotnet_version}"
    always_on                = true
  }
  
  app_settings = {
    "ASPNETCORE_ENVIRONMENT" = "Staging"
  }
}

# Traffic routing configuration
resource "azurerm_app_service_active_slot" "main" {
  resource_group_name = azurerm_resource_group.main.name
  app_service_name    = azurerm_app_service.main.name
  app_service_slot_name = azurerm_app_service_slot.staging.name
}
```

### 3. Security-First Infrastructure

```hcl
# Network Security Group with least privilege
resource "azurerm_network_security_group" "main" {
  name                = "nsg-${var.app_name}-${var.environment}"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  
  security_rule {
    name                       = "allow-https"
    priority                   = 100
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "443"
    source_address_prefix      = "*"
    destination_address_prefix = "*"
  }
  
  security_rule {
    name                       = "deny-all-other"
    priority                   = 4096
    direction                  = "Inbound"
    access                     = "Deny"
    protocol                   = "*"
    source_port_range          = "*"
    destination_port_range     = "*"
    source_address_prefix      = "*"
    destination_address_prefix = "*"
  }
}
```

## Infrastructure Testing and Validation

### 1. Pre-Deployment Validation

```hcl
# terraform.tfvars validation
variable "sql_admin_password" {
  description = "SQL Server administrator password"
  type        = string
  sensitive   = true
  
  validation {
    condition     = length(var.sql_admin_password) >= 12
    error_message = "SQL admin password must be at least 12 characters long."
  }
  
  validation {
    condition     = can(regex("[A-Z]", var.sql_admin_password))
    error_message = "SQL admin password must contain at least one uppercase letter."
  }
}

# Cost control through resource limits
variable "app_service_sku" {
  description = "App Service plan SKU"
  type        = string
  default     = "B1"
  
  validation {
    condition     = contains(["B1", "B2", "B3", "S1", "S2", "S3"], var.app_service_sku)
    error_message = "App Service SKU must be one of the approved values."
  }
}
```

### 2. Automated Testing with Terratest

```go
// infrastructure_test.go
package test

import (
    "testing"
    "github.com/gruntwork-io/terratest/modules/terraform"
    "github.com/gruntwork-io/terratest/modules/azure"
    "github.com/stretchr/testify/assert"
)

func TestDotNetInfrastructure(t *testing.T) {
    terraformOptions := &terraform.Options{
        TerraformDir: "../infrastructure",
        Vars: map[string]interface{}{
            "app_name":    "myapp",
            "environment": "test",
        },
    }
    
    defer terraform.Destroy(t, terraformOptions)
    terraform.InitAndApply(t, terraformOptions)
    
    // Test App Service exists and is configured correctly
    appServiceName := terraform.Output(t, terraformOptions, "app_service_name")
    assert.True(t, azure.AppServiceExists(t, appServiceName, "", ""))
    
    // Test database is accessible and encrypted
    dbName := terraform.Output(t, terraformOptions, "sql_database_name")
    assert.True(t, azure.SQLDatabaseExists(t, dbName, "", ""))
    
    // Test network security rules
    nsgName := terraform.Output(t, terraformOptions, "network_security_group_name")
    rules := azure.GetNetworkSecurityRules(t, nsgName, "", "")
    assert.Equal(t, 2, len(rules)) // Only allow-https and deny-all-other
}
```

## Environment Management Strategies

### 1. GitOps for Infrastructure

```yaml
# .github/workflows/terraform-apply.yml
name: 'Terraform Apply'
on:
  push:
    branches: [main]
    paths:
      - 'infrastructure/**'

jobs:
  terraform:
    runs-on: ubuntu-latest
    environment: production
    
    steps:
      - name: Checkout
        uses: actions/checkout@v4
        
      - name: Setup Terraform
        uses: hashicorp/setup-terraform@v2
        
      - name: Terraform Init
        run: terraform init -input=false
        
      - name: Terraform Plan
        run: terraform plan -input=false -out=plan.tfplan
        
      - name: Terraform Apply
        run: terraform apply -input=false -auto-approve plan.tfplan
```

### 2. Environment-Specific Configuration

```hcl
# environments/dev/terraform.tfvars
app_name          = "myapp"
environment       = "dev"
dotnet_version    = "8.0"
app_service_sku   = "B1"
sql_sku           = "Basic"
enable_monitoring = false
backup_retention  = 7

# environments/production/terraform.tfvars  
app_name          = "myapp"
environment       = "production"
dotnet_version    = "8.0"
app_service_sku   = "S2"
sql_sku           = "S1"
enable_monitoring = true
backup_retention  = 35
enable_alerting   = true
```

## Security and Compliance

### 1. Secure Secret Management

```hcl
# Never store secrets in Terraform state!
data "azurerm_key_vault" "secrets" {
  name                = "kv-${var.app_name}-secrets"
  resource_group_name = "rg-${var.app_name}-secrets"
}

data "azurerm_key_vault_secret" "sql_admin_password" {
  name         = "sql-admin-password"
  key_vault_id = data.azurerm_key_vault.secrets.id
}

data "azurerm_key_vault_secret" "app_insights_key" {
  name         = "app-insights-key"
  key_vault_id = data.azurerm_key_vault.secrets.id
}
```

### 2. Compliance as Code

```hcl
# HIPAA compliance configuration
resource "azurerm_policy_assignment" "hipaa_compliance" {
  name                 = "hipaa-compliance-${var.app_name}"
  scope                = azurerm_resource_group.main.id
  policy_definition_id = "/providers/Microsoft.Authorization/policySetDefinitions/xxxx-hipaa"
  
  parameters = jsonencode({
    effect = "Audit"
  })
}

# Cost management policies
resource "azurerm_policy_assignment" "cost_control" {
  name                 = "cost-control-${var.app_name}"
  scope                = azurerm_resource_group.main.id
  policy_definition_id = "/providers/Microsoft.Authorization/policyDefinitions/xxxx-cost"
  
  parameters = jsonencode({
    allowedSkus = ["B1", "B2", "B3", "S1", "S2"]
  })
}
```

## Cost Optimization Strategies

### 1. Resource Tagging for Cost Allocation

```hcl
# Standardized tagging across all resources
locals {
  common_tags = {
    Environment = var.environment
    Project     = var.app_name
    Department  = "Engineering"
    CostCenter  = "12345"
    ManagedBy   = "Terraform"
    CreatedDate = timestamp()
  }
}

resource "azurerm_app_service_plan" "main" {
  name = "asp-${var.app_name}-${var.environment}"
  # ... other configuration ...
  
  tags = local.common_tags
}
```

### 2. Right-Sizing Resources

```hcl
# Dynamic sizing based on environment
locals {
  app_service_plan_sku = {
    dev = {
      tier = "Basic"
      size = "B1"
    }
    staging = {
      tier = "Standard"
      size = "S1"  
    }
    production = {
      tier = "Standard"
      size = "S2"
    }
  }
}

resource "azurerm_app_service_plan" "main" {
  name = "asp-${var.app_name}-${var.environment}"
  
  sku {
    tier = local.app_service_plan_sku[var.environment].tier
    size = local.app_service_plan_sku[var.environment].size
  }
}
```

## Disaster Recovery and Backup

```hcl
# Automated backup configuration
resource "azurerm_backup_protected_vm" "main" {
  count = var.environment == "production" ? 1 : 0
  
  resource_group_name = azurerm_resource_group.main.name
  recovery_vault_name = azurerm_recovery_services_vault.main.name
  source_vm_id       = azurerm_virtual_machine.main.id
  
  backup_policy_id   = azurerm_backup_policy_vm.main.id
}

# Cross-region replication for critical data
resource "azurerm_sql_database" "main" {
  name                = "db-${var.app_name}-${var.environment}"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  server_name         = azurerm_sql_server.main.name
  
  # Geo-redundant backup for production
  geo_backup_enabled = var.environment == "production"
}
```

## The Business Impact

### Quantifiable Benefits

- **Environment Consistency**: 100% identical configurations across all environments
- **Deployment Speed**: 2-week setup → 20-minute automated creation
- **Cost Savings**: 30-40% reduction through right-sizing and automation
- **Compliance**: Automated enforcement of security and governance policies

### Risk Reduction

- Eliminate configuration drift between environments
- Automated disaster recovery procedures
- Audit trail for all infrastructure changes
- Reduced security vulnerabilities from manual configurations

## Getting Started: Your IaC Adoption Plan

### Phase 1: Assessment and Planning (2 weeks)

- Inventory existing infrastructure
- Define tagging and naming standards
- Choose IaC tool (Terraform, Bicep, Pulumi)
- Set up version control and CI/CD

### Phase 2: Initial Implementation (4 weeks)

- Create modular infrastructure code
- Implement basic environments (dev, staging)
- Set up testing and validation
- Train development teams

### Phase 3: Advanced Patterns (8 weeks)

- Implement environment factories
- Add security and compliance controls
- Set up monitoring and cost optimization
- Create disaster recovery procedures

### Phase 4: Optimization and Scaling (Ongoing)

- Refine based on usage patterns
- Expand to more complex scenarios
- Implement advanced testing
- Cross-team standardization

## The Mindset Shift

Infrastructure as Code requires thinking of your cloud environment not as a collection of individual resources, but as a software system that needs to be designed, tested, and maintained. It's the difference between being a cloud tenant and being a cloud engineer.

When you treat infrastructure as code, you gain the same benefits that version control brought to software development: reproducibility, collaboration, and continuous improvement. Your infrastructure becomes a strategic asset that enables business agility rather than a constraint that slows you down. At Codzgarage, IaC didn't just automate our infrastructure—it gave us confidence. We could spin up new environments for testing, create production replicas for disaster recovery drills, and know that everything was exactly the same. That peace of mind is worth more than any cost savings.

