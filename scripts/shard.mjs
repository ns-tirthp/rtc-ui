/**
 * Jest Shard Distributor
 *
 * Splits test files into balanced shards based on historical runtime data
 * (from Jest's JSON output). Designed for CI/CD parallelization.
 *
 * Usage:
 *   node distribute-tests.js --shards <N> --index <I> --file <timings.json>
 *
 * Example:
 *   node distribute-tests.js -s 15 -i 3 -f test-timings.json
 *   # prints all test files assigned to shard index 3
 */
import fs from "fs";
import path from "path";
import minimist from "minimist";

export const distribute = (args) => {
    // Explicit argument parsing
    const TOTAL_SHARDS = parseInt(args.shards, 10);
    const TARGET_SHARD_INDEX = parseInt(args.index, 10);
    const TIMINGS_FILE_PATH = args.file;
    const REPO_ROOT = process.cwd();
    const NEW_TESTS = Array.isArray(args._) ? args._ : args._ ? [args._] : [];

    // ---- Input Validation ----
    if (isNaN(TOTAL_SHARDS) || TOTAL_SHARDS <= 0) {
        console.error("Error: --shards must be a positive integer.");
        process.exit(1);
    }

    if (
        isNaN(TARGET_SHARD_INDEX) ||
        TARGET_SHARD_INDEX <= 0 ||
        TARGET_SHARD_INDEX > TOTAL_SHARDS
    ) {
        console.error(`Error: --index must be between 1 and ${TOTAL_SHARDS}.`);
        process.exit(1);
    }

    if (!fs.existsSync(TIMINGS_FILE_PATH)) {
        console.error(`Error: File not found: ${TIMINGS_FILE_PATH}`);
        process.exit(1);
    }

    // ---- Load Jest Timings File ----
    let timingsData;
    try {
        timingsData = JSON.parse(fs.readFileSync(TIMINGS_FILE_PATH, "utf-8"));
    } catch (err) {
        console.error(
            `Error: Failed to parse ${TIMINGS_FILE_PATH}:`,
            err.message,
        );
        process.exit(1);
    }

    if (!timingsData.testResults || !Array.isArray(timingsData.testResults)) {
        console.error(
            `Error: ${TIMINGS_FILE_PATH} does not contain "testResults".`,
        );
        process.exit(1);
    }

    // ---- Extract Test Files & Durations ----
    const testsWithDurations = timingsData.testResults.map((tr) => {
        const relativePath = path.relative(
            REPO_ROOT,
            tr.name || "unknown.test.js",
        );
        const duration =
            tr.endTime && tr.startTime && tr.endTime > tr.startTime
                ? (tr.endTime - tr.startTime) / 1000
                : 1; // fallback: 1s if missing/broken data
        return { file: relativePath, time: duration };
    });

    // Sort tests by descending duration so we place long tests first
    testsWithDurations.sort((a, b) => b.time - a.time);

    // ---- Add New Test Files (default 1s runtime) ----
    testsWithDurations.push(
        ...NEW_TESTS.filter((newTest) => {
            const relative = path.relative(REPO_ROOT, newTest);
            return !testsWithDurations.some((test) => test.file === relative);
        }).map((newTest) => ({
            file: path.relative(REPO_ROOT, newTest),
            time: 1,
        })),
    );

    // ---- Initialize Shards ----
    const shards = Array.from({ length: TOTAL_SHARDS }, () => ({
        totalRuntime: 0,
        files: [],
    }));

    // ---- Greedy Distribution Algorithm ----
    // Always assign the next longest test to the shard with least total runtime.
    for (const test of testsWithDurations) {
        shards.sort((a, b) => a.totalRuntime - b.totalRuntime);
        shards[0].files.push(test.file);
        shards[0].totalRuntime += test.time ? test.time : 0;
    }
    shards.sort((a, b) => b.totalRuntime - a.totalRuntime);
    // ---- Output Selected Shard ----
    const selectedShard = shards[TARGET_SHARD_INDEX - 1];
    if (!selectedShard || selectedShard.files.length === 0) {
        console.error(`Warning: Shard ${TARGET_SHARD_INDEX} is empty.`);
        process.exit(0);
    }

    let allShards = shards
        .filter((shard) => shard.files.length > 0)
        .map((shard) => shard.files.join(" "));
    // Print space-separated list of test files for the shard
    return allShards.map((shard, index) => {
        return { index: index + 1, files: shard };
    });
};

// ---- Parse CLI Arguments ----
const args = minimist(process.argv.slice(2), {
    alias: {
        s: "shards",
        i: "index",
        f: "file",
    },
    default: {
        shards: 1, // total number of shards
        index: 1, // which shard index to output
        file: "timing.json", // path to Jest JSON timings file
    },
});
const result = distribute(args);
console.log(result);
