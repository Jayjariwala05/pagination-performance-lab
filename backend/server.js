
const express = require("express");
const cors = require("cors");
const { MongoClient } = require("mongodb");
const { runBenchmark } = require("./benchmark");

const { generateDataset } = require("./data-generator");

const {
    offsetPagination,
    cursorPagination
} = require("./pagination");

// Express application
const app = express();
const PORT = 8081;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB connection
const uri = "mongodb://127.0.0.1:27017";
const client = new MongoClient(uri);

let db;

// ======================================
// 1. HEALTH CHECK API
// ======================================

app.get("/api/health", async (req, res) => {
    try {
        await db.command({ ping: 1 });

        res.json({
            status: "success",
            message: "Backend and MongoDB connected"
        });

    } catch (error) {
        res.status(500).json({
            status: "error",
            message: error.message
        });
    }
});

// ======================================
// 2. DYNAMIC DATASET GENERATION API
// ======================================

app.post("/api/generate", async (req, res) => {
    try {
        const { count } = req.body || {};

        console.log("Requested record count:", count);

        if (
            !Number.isInteger(count) ||
            count < 1 ||
            count > 500000
        ) {
            return res.status(400).json({
                success: false,
                error: "Record count must be between 1 and 500000"
            });
        }

        console.log("Starting dataset generation...");

        const result = await generateDataset(db, count);

        console.log("Dataset generation completed!");

        res.json({
            message: "Dataset generated successfully",
            ...result
        });

    } catch (error) {
        console.error(
            "Error generating dataset:",
            error.message
        );

        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ======================================
// 3. OFFSET PAGINATION API
// ======================================

app.get("/api/pagination/offset", async (req, res) => {
    try {
        const page = Number(req.query.page);
        const pageSize = Number(req.query.pageSize);

        if (
            !Number.isSafeInteger(page) ||
            page < 1 ||
            !Number.isSafeInteger(pageSize) ||
            pageSize < 1 ||
            pageSize > 1000
        ) {
            return res.status(400).json({
                success: false,
                error: "Invalid page or pageSize"
            });
        }

        const result = await offsetPagination(
            db,
            page,
            pageSize
        );

        res.json({
            success: true,
            ...result
        });

    } catch (error) {
        console.error(
            "Offset pagination error:",
            error.message
        );

        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ======================================
// 4. CURSOR PAGINATION API
// ======================================

app.get("/api/pagination/cursor", async (req, res) => {
    try {
        const pageSize = Number(req.query.pageSize);

        const cursor =
            req.query.cursor === undefined ||
                req.query.cursor === "null"
                ? null
                : Number(req.query.cursor);

        if (
            !Number.isSafeInteger(pageSize) ||
            pageSize < 1 ||
            pageSize > 1000 ||
            (
                cursor !== null &&
                (
                    !Number.isSafeInteger(cursor) ||
                    cursor < 0
                )
            )
        ) {
            return res.status(400).json({
                success: false,
                error: "Invalid cursor or pageSize"
            });
        }

        const result = await cursorPagination(
            db,
            cursor,
            pageSize
        );

        res.json({
            success: true,
            ...result
        });

    } catch (error) {
        console.error(
            "Cursor pagination error:",
            error.message
        );

        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ======================================
// 5. START BACKEND SERVER
// ======================================

async function startServer() {
    try {
        await client.connect();

        db = client.db("pagination_performance_lab");

        await db.command({ ping: 1 });

        console.log("MongoDB connected successfully");

        app.listen(PORT, () => {
            console.log(
                `Backend running at http://localhost:${PORT}`
            );
        });

    } catch (error) {
        console.error(
            "Connection failed:",
            error.message
        );

        process.exit(1);
    }
}
app.post("/api/benchmark", async (req, res) => {
    try {
        const { page, pageSize, runs = 10 } = req.body || {};

        if (
            !Number.isSafeInteger(page) ||
            page < 1 ||
            !Number.isSafeInteger(pageSize) ||
            pageSize < 1 ||
            pageSize > 1000 ||
            !Number.isSafeInteger(runs) ||
            runs < 1 ||
            runs > 100
        ) {
            return res.status(400).json({
                success: false,
                error: "Invalid page, pageSize or runs"
            });
        }

        const result = await runBenchmark(
            db,
            page,
            pageSize,
            runs
        );

        res.json({
            success: true,
            ...result
        });

    } catch (error) {
        console.error("Benchmark error:", error.message);

        res.status(
            error.message === "Page exceeds available records"
                ? 400
                : 500
        ).json({
            success: false,
            error: error.message
        });
    }
});

startServer();
