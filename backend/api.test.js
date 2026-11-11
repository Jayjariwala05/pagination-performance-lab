
const { test } = require("node:test");
const assert = require("node:assert/strict");

const API = "http://127.0.0.1:8081";

async function request(path, options = {}) {
    const response = await fetch(`${API}${path}`, {
        ...options,
        signal: AbortSignal.timeout(15000)
    });

    const data = await response.json();

    return {
        status: response.status,
        data
    };
}

test("TC-04: Backend health check", async () => {
    const result = await request("/api/health");

    assert.equal(result.status, 200);
    assert.equal(result.data.status, "success");
});

test("TC-05: Reject invalid dataset size", async () => {
    const result = await request("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count: -100 })
    });

    assert.equal(result.status, 400);
    assert.equal(result.data.success, false);
});

test("TC-06: Reject invalid offset page", async () => {
    const result = await request(
        "/api/pagination/offset?page=0&pageSize=20"
    );

    assert.equal(result.status, 400);
    assert.equal(result.data.success, false);
});

test("TC-07: Reject invalid cursor", async () => {
    const result = await request(
        "/api/pagination/cursor?cursor=-1&pageSize=20"
    );

    assert.equal(result.status, 400);
    assert.equal(result.data.success, false);
});

test("TC-08: Reject invalid benchmark runs", async () => {
    const result = await request("/api/benchmark", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            page: 1,
            pageSize: 20,
            runs: 0
        })
    });

    assert.equal(result.status, 400);
    assert.equal(result.data.success, false);
});

test("TC-09: Offset pagination returns correct records", async () => {
    const result = await request(
        "/api/pagination/offset?page=1&pageSize=5"
    );

    assert.equal(result.status, 200);
    assert.equal(result.data.success, true);
    assert.equal(result.data.records.length, 5);

    const ids = result.data.records.map(r => r.recordId);

    assert.deepEqual(ids, [1, 2, 3, 4, 5]);
});

test("TC-10: Cursor pagination returns correct records", async () => {
    const result = await request(
        "/api/pagination/cursor?cursor=5&pageSize=5"
    );

    assert.equal(result.status, 200);
    assert.equal(result.data.success, true);

    const ids = result.data.records.map(r => r.recordId);

    assert.deepEqual(ids, [6, 7, 8, 9, 10]);
    assert.equal(result.data.nextCursor, 10);
});

test("TC-11: Both algorithms return matching records", async () => {
    const result = await request("/api/benchmark", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            page: 10,
            pageSize: 20,
            runs: 3
        })
    });

    assert.equal(result.status, 200);
    assert.equal(result.data.success, true);
    assert.equal(result.data.resultsMatch, true);
    assert.equal(result.data.offset.recordsReturned, 20);
    assert.equal(result.data.cursor.recordsReturned, 20);
});
