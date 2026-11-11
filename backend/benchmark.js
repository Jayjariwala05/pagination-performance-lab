
const { performance } = require("node:perf_hooks");

function median(values) {
    const sorted = [...values].sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);

    return sorted.length % 2 === 0
        ? (sorted[middle - 1] + sorted[middle]) / 2
        : sorted[middle];
}

async function runBenchmark(db, page, pageSize, runs = 10) {
    const collection = db.collection("benchmark_records");

    const totalRecords = await collection.countDocuments();

    const skip = (page - 1) * pageSize;

    if (skip >= totalRecords) {
        throw new Error("Page exceeds available records");
    }

    // Synthetic records have consecutive recordId values
    // beginning at 1. This allows direct cursor comparison.
    const cursor = skip;

    const offsetQuery = () =>
        collection.find({})
            .sort({ recordId: 1 })
            .skip(skip)
            .limit(pageSize)
            .toArray();

    const cursorQuery = () =>
        collection.find({
            recordId: { $gt: cursor }
        })
            .sort({ recordId: 1 })
            .limit(pageSize)
            .toArray();

    // Warm-up queries
    await offsetQuery();
    await cursorQuery();

    const offsetTimes = [];
    const cursorTimes = [];

    let offsetRecords = [];
    let cursorRecords = [];

    // Alternate query order across runs
    for (let i = 0; i < runs; i++) {
        const measure = async (query) => {
            const start = performance.now();
            const records = await query();

            return {
                time: performance.now() - start,
                records
            };
        };

        if (i % 2 === 0) {
            const offset = await measure(offsetQuery);
            const cursor = await measure(cursorQuery);

            offsetTimes.push(offset.time);
            cursorTimes.push(cursor.time);

            offsetRecords = offset.records;
            cursorRecords = cursor.records;
        } else {
            const cursor = await measure(cursorQuery);
            const offset = await measure(offsetQuery);

            cursorTimes.push(cursor.time);
            offsetTimes.push(offset.time);

            offsetRecords = offset.records;
            cursorRecords = cursor.records;
        }
    }

    const offsetExplain = await collection.find({})
        .sort({ recordId: 1 })
        .skip(skip)
        .limit(pageSize)
        .explain("executionStats");

    const cursorExplain = await collection.find({
        recordId: { $gt: cursor }
    })
        .sort({ recordId: 1 })
        .limit(pageSize)
        .explain("executionStats");

    const offsetIds = offsetRecords.map(r => r.recordId);
    const cursorIds = cursorRecords.map(r => r.recordId);

    const resultsMatch =
        JSON.stringify(offsetIds) === JSON.stringify(cursorIds);

    const round = value => Number(value.toFixed(3));

    return {
        totalRecords,
        page,
        pageSize,
        runs,
        resultsMatch,
        comparisonNote:
            "Cursor boundary is derived from consecutive synthetic record IDs.",
        offset: {
            medianMs: round(median(offsetTimes)),
            timesMs: offsetTimes.map(round),
            keysExamined:
                offsetExplain.executionStats.totalKeysExamined,
            docsExamined:
                offsetExplain.executionStats.totalDocsExamined,
            recordsReturned: offsetRecords.length
        },
        cursor: {
            medianMs: round(median(cursorTimes)),
            timesMs: cursorTimes.map(round),
            keysExamined:
                cursorExplain.executionStats.totalKeysExamined,
            docsExamined:
                cursorExplain.executionStats.totalDocsExamined,
            recordsReturned: cursorRecords.length
        }
    };
}

module.exports = { runBenchmark };