require("dotenv").config();

const test = require("node:test");
const assert = require("node:assert");

const app = require("../src/app");
const pool = require("../src/config/db");

let server;
let baseUrl;

test.before(() => {
    server = app.listen(0);
    baseUrl = `http://localhost:${server.address().port}`;
});

test("GET / should return API health message", async () => {
    const response = await fetch(`${baseUrl}/`);
    const data = await response.json();

    assert.strictEqual(response.status, 200);
    assert.strictEqual(data.success, true);
    assert.strictEqual(
        data.message,
        "Usage Metering & Billing Engine API is running"
    );
});

test("POST /generate should record usage successfully", async () => {
    const idempotencyKey = `test-key-${Date.now()}`;

    const body = {
        tenant_id: 1,
        request_id: `test-request-${Date.now()}`,
        input_tokens: 100,
        output_tokens: 100,
        cached_input_tokens: 0,
        reasoning_tokens: 0,
        total_tokens: 200,
        api_calls: 1
    };

    test("POST /generate should return duplicate for the same idempotency key", async () => {
    const idempotencyKey = `idempotency-test-${Date.now()}`;

    const body = {
        tenant_id: 1,
        request_id: `idempotency-request-${Date.now()}`,
        input_tokens: 50,
        output_tokens: 50,
        cached_input_tokens: 0,
        reasoning_tokens: 0,
        total_tokens: 100,
        api_calls: 1
    };

    // First request
    const firstResponse = await fetch(`${baseUrl}/generate`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Idempotency-Key": idempotencyKey
        },
        body: JSON.stringify(body)
    });

    const firstData = await firstResponse.json();

    assert.strictEqual(firstResponse.status, 200);
    assert.strictEqual(firstData.success, true);
    assert.strictEqual(firstData.duplicate, false);

    // Second request with the SAME idempotency key
    const secondResponse = await fetch(`${baseUrl}/generate`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Idempotency-Key": idempotencyKey
        },
        body: JSON.stringify(body)
    });

    const secondData = await secondResponse.json();

    assert.strictEqual(secondResponse.status, 200);
    assert.strictEqual(secondData.success, true);
    assert.strictEqual(secondData.duplicate, true);

    // Database must contain only ONE event for this idempotency key
    const dbResult = await pool.query(
        `SELECT COUNT(*) AS count
         FROM usage_events
         WHERE idempotency_key = $1`,
        [idempotencyKey]
    );

    assert.strictEqual(Number(dbResult.rows[0].count), 1);
});

    const response = await fetch(`${baseUrl}/generate`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Idempotency-Key": idempotencyKey
        },
        body: JSON.stringify(body)
    });

    const data = await response.json();

    assert.strictEqual(response.status, 200);
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.duplicate, false);

    assert.strictEqual(data.data.tenant_id, 1);
    assert.strictEqual(data.data.request_id, body.request_id);
    assert.strictEqual(data.data.total_tokens, 200);
    assert.strictEqual(data.data.api_calls, 1);

    const dbResult = await pool.query(
        `SELECT idempotency_key, tenant_id, total_tokens, api_calls
         FROM usage_events
         WHERE idempotency_key = $1`,
        [idempotencyKey]
    );

    assert.strictEqual(dbResult.rows.length, 1);
    assert.strictEqual(dbResult.rows[0].tenant_id, 1);
    assert.strictEqual(Number(dbResult.rows[0].total_tokens), 200);
    assert.strictEqual(Number(dbResult.rows[0].api_calls), 1);
});

test("POST /generate should reject requests when request quota is exceeded", async () => {
    // Temporarily reduce the Pro plan request limit.
    await pool.query(
        `UPDATE plans
         SET monthly_request_limit = 3
         WHERE id = 2`
    );

    try {
        const idempotencyKey = `quota-test-${Date.now()}`;

        const body = {
            tenant_id: 1,
            request_id: `quota-request-${Date.now()}`,
            input_tokens: 10,
            output_tokens: 10,
            cached_input_tokens: 0,
            reasoning_tokens: 0,
            total_tokens: 20,
            api_calls: 2
        };

        const response = await fetch(`${baseUrl}/generate`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Idempotency-Key": idempotencyKey
            },
            body: JSON.stringify(body)
        });

        const data = await response.json();

        assert.strictEqual(response.status, 429);
        assert.strictEqual(data.success, false);
        assert.match(
            data.message,
            /API request quota exceeded/
        );

        // The rejected request must NOT be recorded.
        const dbResult = await pool.query(
            `SELECT COUNT(*) AS count
             FROM usage_events
             WHERE idempotency_key = $1`,
            [idempotencyKey]
        );

        assert.strictEqual(Number(dbResult.rows[0].count), 0);
    } finally {
        // Restore the real Pro limit.
        await pool.query(
            `UPDATE plans
             SET monthly_request_limit = 10000
             WHERE id = 2`
        );
    }
});

test("POST /generate should reject requests when token quota is exceeded", async () => {
    // Temporarily reduce the Pro plan token limit.
    await pool.query(
        `UPDATE plans
         SET monthly_token_limit = 1700
         WHERE id = 2`
    );

    try {
        const idempotencyKey = `token-quota-test-${Date.now()}`;

        const body = {
            tenant_id: 1,
            request_id: `token-quota-request-${Date.now()}`,
            input_tokens: 100,
            output_tokens: 100,
            cached_input_tokens: 0,
            reasoning_tokens: 0,
            total_tokens: 200,
            api_calls: 1
        };

        const response = await fetch(`${baseUrl}/generate`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Idempotency-Key": idempotencyKey
            },
            body: JSON.stringify(body)
        });

        const data = await response.json();

        assert.strictEqual(response.status, 429);
        assert.strictEqual(data.success, false);
        assert.match(
            data.message,
            /AI token quota exceeded/
        );

        // The rejected request must NOT be recorded.
        const dbResult = await pool.query(
            `SELECT COUNT(*) AS count
             FROM usage_events
             WHERE idempotency_key = $1`,
            [idempotencyKey]
        );

        assert.strictEqual(Number(dbResult.rows[0].count), 0);
    } finally {
        // Restore the real Pro token limit.
        await pool.query(
            `UPDATE plans
             SET monthly_token_limit = 1000000
             WHERE id = 2`
        );
    }
});
test("POST /generate should calculate billing cost correctly", async () => {
    const idempotencyKey = `cost-test-${Date.now()}`;

    const body = {
        tenant_id: 1,
        request_id: `cost-request-${Date.now()}`,
        input_tokens: 1000,
        output_tokens: 300,
        cached_input_tokens: 200,
        reasoning_tokens: 100,
        total_tokens: 1400,
        api_calls: 2
    };

    const response = await fetch(`${baseUrl}/generate`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Idempotency-Key": idempotencyKey
        },
        body: JSON.stringify(body)
    });

    const data = await response.json();

    assert.strictEqual(response.status, 200);
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.duplicate, false);

    const expectedCost = 0.0225;

    assert.strictEqual(
        Number(data.data.cost),
        expectedCost
    );

    const dbResult = await pool.query(
        `SELECT cost
         FROM usage_events
         WHERE idempotency_key = $1`,
        [idempotencyKey]
    );

    assert.strictEqual(dbResult.rows.length, 1);
    assert.strictEqual(
        Number(dbResult.rows[0].cost),
        expectedCost
    );
});

test("GET /usage should return current usage and active plan limits", async () => {
    const response = await fetch(
        `${baseUrl}/usage?tenant_id=1`
    );

    const data = await response.json();

    assert.strictEqual(response.status, 200);
    assert.strictEqual(data.success, true);

    assert.ok(data.data);
    assert.ok(data.data.used);
    assert.ok(data.data.limits);

    assert.strictEqual(
        typeof data.data.used.requests,
        "number"
    );

    assert.strictEqual(
        typeof data.data.used.tokens,
        "number"
    );

    assert.strictEqual(
        data.data.limits.requests,
        10000
    );

    assert.strictEqual(
        data.data.limits.tokens,
        1000000
    );

    assert.strictEqual(
        typeof data.data.cost,
        "number"
    );

    assert.ok(data.data.used.requests > 0);
    assert.ok(data.data.used.tokens > 0);
    assert.ok(data.data.cost > 0);
});

test.after(async () => {
    server.closeAllConnections();

    await new Promise((resolve) => {
        server.close(resolve);
    });

    await pool.end();
});