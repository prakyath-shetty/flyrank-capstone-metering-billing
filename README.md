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
- Mock payment checkout flow
- Mock payment webhook processing
- Webhook signature verification
- Webhook idempotency
- Subscription creation, update, and cancellation

## Tech Stack

- Node.js
- Express
- PostgreSQL
- Docker / Docker Compose
- pg
- dotenv
- nodemon
- Node.js built-in test runner

> Stripe is not used for the payment flow in this project.
> A mock payment service and mock webhook system are used for testing the billing workflow.

## Project Structure

    src/
    ├── config/
    │   ├── db.js
    │   ├── pricing.js
    │   └── stripe.js
    ├── controllers/
    │   ├── checkoutController.js
    │   ├── generateController.js
    │   ├── mockWebhookController.js
    │   ├── tenantController.js
    │   └── usageController.js
    ├── middleware/
    │   └── validateUsage.js
    ├── migrations/
    │   ├── 001_create_tables.sql
    │   └── 002_create_payment_webhook_events.sql
    ├── routes/
    │   ├── checkoutRoutes.js
    │   ├── generateRoutes.js
    │   ├── mockWebhookRoutes.js
    │   ├── tenantRoutes.js
    │   └── usageRoutes.js
    ├── services/
    │   ├── meterService.js
    │   ├── mockPaymentService.js
    │   ├── mockWebhookService.js
    │   ├── stripeService.js
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

Configure the `.env` file:

    PORT=3000
    DB_HOST=localhost
    DB_PORT=5432
    DB_USER=postgres
    DB_PASSWORD=postgres
    DB_NAME=billing_db
    MOCK_WEBHOOK_SECRET=mock_webhook_secret

## Start PostgreSQL

Start the PostgreSQL Docker container:

    docker compose up -d

Check that the container is running:

    docker compose ps

## Database Migration

The database schema is defined in:

    src/migrations/

Run the migrations:

    Get-Content src/migrations/001_create_tables.sql | docker exec -i billing-postgres psql -U postgres -d billing_db

    Get-Content src/migrations/002_create_payment_webhook_events.sql | docker exec -i billing-postgres psql -U postgres -d billing_db

## Seed Demo Data

Run:

    npm run seed

The seed creates or finds:

- Free plan
- Pro plan
- Demo tenant
- Demo subscription

## Plans

| Plan | Monthly Price | Request Limit | Token Limit |
|------|---------------|---------------|-------------|
| Free | $0.00 | 1,000 | 100,000 |
| Pro | $49.00 | 10,000 | 1,000,000 |

## Run the API

Start the development server:

    npm run dev

Or:

    npm start

The API runs at:

    http://localhost:3000

## API Endpoints

### Health Check

    GET /

Returns the API status.

Example response:

    {
      "success": true,
      "message": "Usage Metering & Billing Engine API is running"
    }

---

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

---

### Record Usage

    POST /generate

Records API usage, calculates cost, checks quotas, and stores the usage event.

Required header:

    Idempotency-Key: unique-request-key

Example request:

    {
      "tenant_id": 1,
      "request_id": "request-001",
      "input_tokens": 1000,
      "cached_input_tokens": 200,
      "output_tokens": 500,
      "reasoning_tokens": 100,
      "total_tokens": 1600,
      "api_calls": 2
    }

---

### Usage Report

    GET /usage?tenant_id=1

Returns:

- Current monthly request usage
- Current monthly token usage
- Active plan limits
- Total monthly cost

Example response:

    {
      "success": true,
      "data": {
        "used": {
          "requests": 17,
          "tokens": 6100
        },
        "limits": {
          "requests": 10000,
          "tokens": 1000000
        },
        "cost": 0.1185
      }
    }

---

### Usage Recording

    POST /usage/record

Records usage using the same metering service used by `/generate`.

---

## Mock Payment Checkout

The project uses a mock payment provider instead of a real Stripe payment integration.

### Create Checkout Session

    POST /checkout

Example request:

    {
      "tenant_id": 1,
      "plan_id": 2
    }

Example response:

    {
      "success": true,
      "checkout_url": "http://localhost:3000/mock-checkout/...",
      "session_id": "cs_test_...",
      "test_mode": true,
      "provider": "mock"
    }

The checkout flow validates:

- Tenant existence
- Plan existence
- Pro plan availability

The mock payment service generates a test checkout session without contacting a real payment provider.

## Mock Payment Webhooks

### Webhook Endpoint

    POST /mock-webhook

The mock webhook endpoint processes subscription events.

Supported event types:

    subscription.created
    subscription.updated
    subscription.cancelled

Each webhook contains:

    {
      "event_id": "evt_test_001",
      "type": "subscription.created",
      "data": {
        "tenant_id": 1,
        "plan_id": 2,
        "subscription_id": "mock_sub_test_001"
      }
    }

## Webhook Signature Verification

Webhook requests require the header:

    x-mock-signature

The signature is generated using HMAC-SHA256 with:

    MOCK_WEBHOOK_SECRET

The server verifies the signature before processing the webhook.

Invalid signatures are rejected.

## Subscription Creation

A `subscription.created` webhook:

- Creates the subscription record
- Sets the subscription status to `active`
- Stores the mock subscription ID
- Updates the tenant's active plan

Example subscription:

    tenant_id: 1
    plan_id: 2
    stripe_subscription_id: mock_sub_test_003
    status: active

The field name `stripe_subscription_id` is retained in the existing database schema for compatibility, but the actual payment provider used by this project is the mock payment service.

## Subscription Update

A `subscription.updated` webhook updates the existing subscription using the mock subscription ID.

The plan and active status are updated without creating a duplicate subscription when the same subscription ID already exists.

## Subscription Cancellation

A `subscription.cancelled` webhook:

- Changes the subscription status to `cancelled`
- Sets `end_date` to the current timestamp

Example:

    status: cancelled
    end_date: 2026-08-28 17:33:44

After cancellation, the tenant no longer has an active subscription.

Therefore:

    GET /usage?tenant_id=1

returns:

    {
      "success": false,
      "message": "No active subscription found"
    }

when no active subscription exists.

## Webhook Idempotency

Webhook events are stored in:

    payment_webhook_events

Each webhook must contain a unique:

    event_id

If the same event is received again, it is not processed twice.

Example duplicate response:

    {
      "success": true,
      "duplicate": true,
      "message": "Webhook already processed"
    }

This prevents duplicate subscription processing.

## Pricing

Pricing is configured in:

    src/config/pricing.js

Current pricing:

    API call             -> 0.001
    Input token          -> 0.00001
    Cached input token   -> 0.0000025
    Output token         -> 0.00003
    Reasoning token      -> 0.00003

Cached input tokens are calculated separately from normal input tokens.

## Cost Calculation

The metering service calculates billing cost using:

    API calls
    + billable input tokens
    + cached input tokens
    + output tokens
    + reasoning tokens

Cached input tokens are excluded from the normal billable input token count.

## Quotas

The active subscription determines the tenant's monthly limits.

The API checks:

- Monthly request quota
- Monthly token quota

If a request would exceed the monthly request limit:

    429 Too Many Requests

If a request would exceed the monthly token limit:

    429 Too Many Requests

Usage exactly at the configured limit is allowed.

Usage beyond the configured limit is rejected.

## Idempotency

Every billable usage request requires an:

    Idempotency-Key

Example:

    Idempotency-Key: unique-request-key

If the same key is submitted again:

- No duplicate usage event is created.
- The original usage event is returned.
- The response contains `duplicate: true`.

The database also enforces uniqueness for the idempotency key.

This prevents duplicate billing when requests are retried.

## Validation

The metering API validates:

- tenant_id
- request_id
- input_tokens
- output_tokens
- cached_input_tokens
- reasoning_tokens
- total_tokens
- api_calls

Invalid or negative numeric values are rejected.

Missing required fields return:

    400 Bad Request

## Testing

Automated tests are implemented using the Node.js built-in test runner.

Run:

    npm test

Current test coverage includes:

- GET `/` health check
- POST `/generate` usage recording
- Idempotency / duplicate request handling
- Request quota enforcement
- Token quota enforcement
- Cost calculation
- GET `/usage` usage reporting

Latest test result:

    tests 7
    pass 7
    fail 0
    cancelled 0
    skipped 0

All automated tests are currently passing.

## Useful Commands

Install dependencies:

    npm install

Start PostgreSQL:

    docker compose up -d

Stop PostgreSQL:

    docker compose down

Seed the database:

    npm run seed

Start development server:

    npm run dev

Start application:

    npm start

Run tests:

    npm test

Check Git status:

    git status

Check Git changes:

    git diff

## Environment Variables

Create a local `.env` file using `.env.example`.

    Copy-Item .env.example .env

Required database configuration:

    PORT=3000
    DB_HOST=localhost
    DB_PORT=5432
    DB_USER=postgres
    DB_PASSWORD=postgres
    DB_NAME=billing_db

Mock webhook configuration:

    MOCK_WEBHOOK_SECRET=mock_webhook_secret

Do not commit `.env` to Git.

The `.gitignore` file excludes `.env`.

## Database

PostgreSQL runs through Docker Compose.

Container:

    billing-postgres

Database:

    billing_db

The database stores:

- Tenants
- Plans
- Subscriptions
- Usage events
- Payment webhook events

## License

This project is licensed under the ISC License.