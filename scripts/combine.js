#!/usr/bin/env node
/**
 * Update Jest test-timings.json with results from latest run.
 *
 * - Merges new Jest JSON output into existing test-timings.json
 * - Updates existing entries if file already present
 * - Adds new test files if missing
 *
 * Usage:
 *   node updateTimings.js --new new-results.json --out test-timings.json
 */

const fs = require("fs");
const minimist = require("minimist");
const path = require("path");

const args = minimist(process.argv.slice(2), {
    alias: { n: "new", o: "out" },
    default: {
        new: "new-results.json", // new jest run (from `--json --outputFile`)
        out: "test-timings.json", // master timings file
    },
});

const NEW_RESULTS_FILE = args.new;
const OUTPUT_TIMINGS_FILE = args.out;

// ---- Validate Inputs ----
if (!fs.existsSync(NEW_RESULTS_FILE)) {
    console.error(
        `Error: New Jest results file not found: ${NEW_RESULTS_FILE}`,
    );
    process.exit(1);
}

let newResults;
try {
    newResults = JSON.parse(fs.readFileSync(NEW_RESULTS_FILE, "utf-8"));
} catch (err) {
    console.error(`Error: Failed to parse ${NEW_RESULTS_FILE}:`, err.message);
    process.exit(1);
}

if (!newResults.testResults || !Array.isArray(newResults.testResults)) {
    console.error(`Error: ${NEW_RESULTS_FILE} does not contain "testResults".`);
    process.exit(1);
}

// ---- Load existing timings (if any) ----
let existingTimings = { testResults: [] };
if (fs.existsSync(OUTPUT_TIMINGS_FILE)) {
    try {
        existingTimings = JSON.parse(
            fs.readFileSync(OUTPUT_TIMINGS_FILE, "utf-8"),
        );
    } catch (err) {
        console.warn(
            `Warning: Failed to parse existing ${OUTPUT_TIMINGS_FILE}, starting fresh.`,
        );
        existingTimings = { testResults: [] };
    }
}

// ---- Convert existing results to a map for fast lookup ----
const existingMap = new Map();
for (const tr of existingTimings.testResults) {
    existingMap.set(path.resolve(tr.name), tr);
}

// ---- Merge new results ----
for (const newTr of newResults.testResults) {
    if (!newTr.name) continue;
    const absPath = path.resolve(newTr.name);

    // If already present, override with latest run
    existingMap.set(absPath, newTr);
}

// ---- Save merged results ----
const merged = {
    testResults: Array.from(existingMap.values()),
};

fs.writeFileSync(OUTPUT_TIMINGS_FILE, JSON.stringify(merged, null, 2));
console.log(`Updated timings written to ${OUTPUT_TIMINGS_FILE}`);
