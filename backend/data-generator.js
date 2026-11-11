
async function generateDataset(db, count) {
    if (!Number.isInteger(count) || count < 1 || count > 500000) {
        throw new Error("Record count must be between 1 and 500000");
    }

    const collection = db.collection("benchmark_records");

    // Clear only the dedicated benchmark collection
    await collection.deleteMany({});

    const batchSize = 5000;

    for (let start = 1; start <= count; start += batchSize) {
        const records = [];

        for (
            let i = start;
            i <= Math.min(start + batchSize - 1, count);
            i++
        ) {
            records.push({
                recordId: i,
                name: `Record ${i}`,
                category: `Category ${i % 5}`,
                createdAt: new Date()
            });
        }

        await collection.insertMany(records);
    }

    await collection.createIndex({ recordId: 1 });

    return {
        success: true,
        totalRecords: await collection.countDocuments()
    };
}

module.exports = { generateDataset };
