
async function offsetPagination(db, page, pageSize) {
    const collection = db.collection("benchmark_records");

    const skip = (page - 1) * pageSize;

    const start = performance.now();

    const records = await collection
        .find({})
        .sort({ recordId: 1 })
        .skip(skip)
        .limit(pageSize)
        .toArray();

    const executionTime = performance.now() - start;

    return {
        method: "Offset Pagination",
        page,
        pageSize,
        executionTime: Number(executionTime.toFixed(3)),
        records
    };
}

async function cursorPagination(db, cursor, pageSize) {
    const collection = db.collection("benchmark_records");

    const query = cursor === null
        ? {}
        : { recordId: { $gt: cursor } };

    const start = performance.now();

    const records = await collection
        .find(query)
        .sort({ recordId: 1 })
        .limit(pageSize)
        .toArray();

    const executionTime = performance.now() - start;

    return {
        method: "Cursor Pagination",
        pageSize,
        executionTime: Number(executionTime.toFixed(3)),
        nextCursor: records.length
            ? records[records.length - 1].recordId
            : null,
        records
    };
}

module.exports = {
    offsetPagination,
    cursorPagination
};
