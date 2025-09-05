#!/usr/bin/env node
/**
 * Jest Shard Distributor
 *
 * Splits test files into balanced shards based on historical runtime data
 * (from Jest's JSON output). Designed for CI/CD parallelization.
 *
 * Usage:
 * node distributeTests.js --shards <N> [--index <I>] --file <timings.json> [-- <newTestFile1> <newTestFile2> ...]
 *
 * Example:
 * node distributeTests.js -s 15 -i 3 -f test-timings.json
 * # prints the test files assigned to shard index 3
 *
 * node distributeTests.js -s 15 -f test-timings.json
 * # prints all shards and their assigned test files
 */
import fs from "fs";
import path from "path";
import { parseArgs } from "util";

/**
 * Parses command line arguments for test distribution.
 * @returns {object} An object containing parsed arguments: totalShards, targetShardIndex, timingsFilePath, newTests.
 * @throws {Error} If required arguments are missing or invalid.
 */
function parseArguments() {
    const { values: args } = parseArgs({
        options: {
            shards: { type: "string", short: "s", default: "1" },
            index: { type: "string", short: "i" },
            file: { type: "string", short: "f", default: "timing.json" },
        },
        allowPositionals: true,
    });

    const totalShards = parseInt(args.shards, 10);
    // Determine targetShardIndex. It's null if --index was not explicitly provided.
    const targetShardIndex =
        typeof args.index !== "undefined" ? parseInt(args.index, 10) : null;
    const timingsFilePath = args.file;

    // ---- Input Validation ----
    if (isNaN(totalShards) || totalShards <= 0) {
        throw new Error("Error: --shards must be a positive integer.");
    }

    if (targetShardIndex !== null) {
        // Only validate if an index was provided
        if (
            isNaN(targetShardIndex) ||
            targetShardIndex <= 0 ||
            targetShardIndex > totalShards
        ) {
            throw new Error(
                `Error: --index must be between 1 and ${totalShards} when provided.`,
            );
        }
    }

    if (!fs.existsSync(timingsFilePath)) {
        throw new Error(`Error: Timings file not found: ${timingsFilePath}`);
    }

    return { totalShards, targetShardIndex, timingsFilePath };
}

/**
 * Loads and validates Jest timing data from a JSON file.
 * @param {string} filePath - The path to the Jest timings JSON file.
 * @returns {Array<object>} An array of test results with file paths and durations.
 * @throws {Error} If the file cannot be read, parsed, or has an invalid structure.
 */
function loadTimingsData(filePath) {
    let timingsData;
    try {
        timingsData = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    } catch (err) {
        throw new Error(`Failed to parse ${filePath}: ${err.message}`);
    }

    if (!timingsData.testResults || !Array.isArray(timingsData.testResults)) {
        throw new Error(`${filePath} does not contain "testResults" array.`);
    }

    const REPO_ROOT = process.cwd();
    return timingsData.testResults.map((tr) => {
        const relativePath = path.relative(
            REPO_ROOT,
            tr.name || "unknown.test.js",
        );
        // Calculate duration; fallback to 1 second if data is missing or invalid
        const duration =
            tr.endTime && tr.startTime && tr.endTime > tr.startTime
                ? (tr.endTime - tr.startTime) / 1000
                : 1;
        return { file: relativePath, time: duration };
    });
}

/**
 * Distributes tests into shards using a greedy algorithm to balance total runtime.
 * Tests are sorted by descending duration, and then assigned to the shard with the least current total runtime.
 * @param {Array<object>} testsWithDurations - Sorted list of tests with their durations.
 * @param {number} totalShards - The total number of shards to create.
 * @returns {Array<object>} An array of shard objects, each containing totalRuntime and files.
 */
function distributeTestsIntoShards(testsWithDurations, totalShards) {
    // Sort tests by descending duration to optimize greedy distribution for balance
    testsWithDurations.sort((a, b) => b.time - a.time);

    const shards = Array.from({ length: totalShards }, () => ({
        totalRuntime: 0,
        files: [],
    }));

    // Greedy Distribution Algorithm: Always assign the next longest test to the shard with the least total runtime.
    for (const test of testsWithDurations) {
        // Sort by totalRuntime to find the least loaded shard
        shards.sort((a, b) => a.totalRuntime - b.totalRuntime);
        shards[0].files.push(test.file);
        shards[0].totalRuntime += test.time;
    }
    // Do not sort shards here to maintain the order in which they were filled for consistent indexing.
    return shards;
}

/**
 * Main function to execute the test distribution logic.
 */
async function main() {
    try {
        const { totalShards, targetShardIndex, timingsFilePath } =
            parseArguments();

        // Load and process historical test timings
        let tests = loadTimingsData(timingsFilePath);

        if (tests.length === 0) {
            console.warn("Warning: No test files found to distribute.");
            process.exit(0);
        }

        // Distribute tests into shards
        const shards = distributeTestsIntoShards(tests, totalShards);

        // Prepare the output array of all shards, filtering out any empty shards
        const allShardsOutput = shards
            .filter((shard) => shard.files.length > 0)
            .map((shard, index) => ({
                index: index + 1, // Shard index starts from 1
                files: shard.files.join(" "),
            }));

        if (targetShardIndex === null) {
            // If no index was provided, output all shards in JSON format
            console.log(JSON.stringify(allShardsOutput));
        } else {
            // If a specific index was provided, find and output only that shard
            const selectedShardOutput = allShardsOutput.find(
                (shard) => shard.index === targetShardIndex,
            );

            if (!selectedShardOutput) {
                console.warn(
                    `Warning: Shard ${targetShardIndex} not found or is empty after distribution.`,
                );
                process.exit(0);
            }
            console.log(selectedShardOutput);
        }
    } catch (err) {
        console.error(err.message);
        process.exit(1);
    }
}

// Execute the main function
main();
