# FlyRank Capstone - Metering & Billing

A multi-tenant usage metering and billing API built with Node.js, Express, and PostgreSQL.

## Features

- Multi-tenant usage tracking
- Free and Pro plans
- Monthly request quotas
- Monthly token quotas
- Idempotent usage recording
- Token-aware cost calculation
- Monthly usage reporting
- Tenant creation API
- Request validation
- PostgreSQL persistence
- Docker Compose development database

## Tech Stack

- Node.js
- Express
- PostgreSQL
- Docker / Docker Compose
- pg
- dotenv
- nodemon
- Stripe

## Project Structure

    src/
    ├── config/
    │   ├── db.js
    │   └── pricing.js
    ├── controllers/
    │   ├── generateController.js
    │   ├── tenantController.js
    │   └── usageController.js
    ├── middleware/
    │   └── validateUsage.js
    ├── migrations/
    │   └── 001_create_tables.sql
    ├── routes/
    │   ├── generateRoutes.js
    │   ├── tenantRoutes.js
    │   └── usageRoutes.js
    ├── services/
    │   ├── meterService.js
    │   └── tenantServices.js
    ├── app.js
    ├── seed.js
    └── server.js

## Prerequisites

Before running the project, make sure you have installed:

- Node.js
- Docker Desktop
- Docker Compose

## Installation

Install the project dependencies:

    npm install

Create the environment file:

    Copy-Item .env.example .env

Configure the .env file:

    PORT=3000
    DB_HOST=localhost
    DB_PORT=5432
    DB_USER=postgres
    DB_PASSWORD=postgres
    DB_NAME=billing_db

## Start PostgreSQL

Start the PostgreSQL Docker container:

    docker compose up -d

Check that the container is running:

    docker compose ps

## Database Migration

The database schema is defined in:

    src/migrations/001_create_tables.sql

Run the migration:

    Get-Content src/migrations/001_create_tables.sql | docker exec -i billing-postgres psql -U postgres -d billing_db

## Seed Demo Data

Run the seed script to create the default plans, demo tenant, and demo subscription:

    npm run seed

The seed creates or finds:

    Free plan
    Pro plan
    Demo tenant
    Demo active subscription

Default plans:

    Free → $0.00/month → 1,000 requests → 100,000 tokens
    Pro  → $49.00/month → 10,000 requests → 1,000,000 tokens

## Run the API

Start the development server:

    npm run dev

Or start the application normally:

    npm start

The API will run at:

    http://localhost:3000

## API Endpoints

### Health Check

    GET /

Returns the current API status.

### Create Tenant

    POST /tenants

Creates a new tenant.

Example request:

    {
      "company_name": "Example Company",
      "email": "example@example.com",
      "phone": "9999999999",
      "website": "https://example.com",
      "plan_id": 1
    }

### Record Usage

    POST /generate

Records API usage, calculates cost, and checks the tenant's monthly quotas.

Required header:

    Idempotency-Key: unique-request-key

Example request:

    {
      "tenant_id": 2,
      "request_id": "request-001",
      "input_tokens": 1000,
      "cached_input_tokens": 200,
      "output_tokens": 500,
      "reasoning_tokens": 100,
      "total_tokens": 1600,
      "api_calls": 2
    }

### Usage Report

    GET /usage?tenant_id=2

Returns the tenant's current monthly usage, limits, and total cost.

### Usage Recording

    POST /usage/record

Records usage using the same metering service as the /generate endpoint.

## Pricing

Pricing is configured in:

    src/config/pricing.js

Current pricing:

    API call             → 0.001
    Input token          → 0.00001
    Cached input token   → 0.0000025
    Output token         → 0.00003
    Reasoning token      → 0.00003

Cached input tokens are calculated separately from normal input tokens.

## Cost Calculation

The metering service calculates the usage cost using:

    API calls
    + billable input tokens
    + cached input tokens
    + output tokens
    + reasoning tokens

For input tokens, cached input tokens are excluded from the normal billable input token count.

## Quotas

The active subscription determines the tenant's monthly limits.

The API checks two monthly quotas:

    Request quota
    Token quota

If a request would exceed the monthly request limit, the API returns:

    429 Too Many Requests

If a request would exceed the monthly token limit, the API returns:

    429 Too Many Requests

Usage exactly at the configured limit is allowed.

Usage beyond the configured limit is rejected.

## Idempotency

Every billable usage request requires an Idempotency-Key header.

    Idempotency-Key: unique-request-key

If the same idempotency key is submitted again:

    No duplicate usage event is created.
    The original usage event is returned.
    The response contains duplicate: true.

The database also enforces uniqueness for the idempotency key.

This prevents duplicate billing when the same request is retried.

## Validation

The metering API validates incoming requests before processing them.

The following fields are validated:

    tenant_id
    request_id
    input_tokens
    output_tokens
    cached_input_tokens
    reasoning_tokens
    total_tokens
    api_calls

Invalid or negative numeric values are rejected.

Missing required fields are rejected with:

    400 Bad Request

## Useful Commands

Install dependencies:

    npm install

Start PostgreSQL:

    docker compose up -d

Stop PostgreSQL:

    docker compose down

Seed the database:

    npm run seed

Start the development server:

    npm run dev

Start the application:

    npm start

Check Git status:

    git status


## Testing

The following functionality has been manually tested:

    Tenant creation
    Duplicate tenant email handling
    Usage recording
    Idempotency
    Request quota enforcement
    Token quota enforcement
    Cost calculation
    Usage reporting
    Request validation
    Valid metering requests
    Duplicate request handling

The API was tested against the PostgreSQL database to verify that usage totals and calculated costs match the stored data.

## Environment Variables

Create a local .env file using .env.example.

    Copy-Item .env.example .env

The .env file should contain:

    PORT=3000
    DB_HOST=localhost
    DB_PORT=5432
    DB_USER=postgres
    DB_PASSWORD=postgres
    DB_NAME=billing_db

Do not commit the .env file to Git.

The .gitignore file already excludes .env.

## License

This project is licensed under the ISC License.