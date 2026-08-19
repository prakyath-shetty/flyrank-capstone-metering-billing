CREATE TABLE plans(
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    monthly_price DECIMAL(10,2) NOT NULL,
    monthly_request_limit INTEGER NOT NULL,
    monthly_token_limit INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE tenants (
   id SERIAL PRIMARY KEY,
   company_name VARCHAR(100) NOT NULL,
   email VARCHAR(255) UNIQUE NOT NULL,
   phone VARCHAR(20),
   website VARCHAR(255),
   plan_id INTEGER NOT NULL,
   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
   CONSTRAINT fk_plan
      FOREIGN KEY (plan_id) 
      REFERENCES plans(id) 
      ON UPDATE CASCADE 
      ON DELETE RESTRICT
);

CREATE TABLE subscriptions(
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER  NOT NULL,
    plan_id INTEGER NOT NULL,
    stripe_subscription_id VARCHAR(255) UNIQUE,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    start_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    end_date TIMESTAMP,

    CONSTRAINT fk_subscription_tenant
        FOREIGN KEY (tenant_id)
        REFERENCES tenants(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_subscription_plan    
        FOREIGN KEY (plan_id)
        REFERENCES plans(id)
        ON DELETE RESTRICT
);

CREATE TABLE usage_events (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL,
    request_id VARCHAR(255) UNIQUE NOT NULL,
    input_tokens INTEGER NOT NULL DEFAULT 0,
    output_tokens INTEGER NOT NULL DEFAULT 0,
    cached_input_tokens INTEGER DEFAULT 0,
    reasoning_tokens INTEGER DEFAULT 0,
    total_tokens INTEGER NOT NULL,
    api_calls INTEGER NOT NULL DEFAULT 1,
    cost DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_usage_tenant
        FOREIGN KEY (tenant_id)
        REFERENCES tenants(id)
        ON DELETE CASCADE
);

ALTER TABLE usage_events ADD COLUMN idempotency_key VARCHAR(255) UNIQUE NOT NULL;