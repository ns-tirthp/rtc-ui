#!/usr/bin/env node
/**
 * Update Jest test-timings.json with results from latest run.
 *
 * - Merges new Jest JSON output into existing test-timings.json
 * - Updates existing entries if file already present
 * - Adds new test files if missing
 *
 * Usage:
 * node updateTimings.js --new new-results.json --out test-timings.json --deleted "path/to/deleted/file1.js path/to/deleted/file2.js"
 */

import fs from "fs";
import path from "path";
import minimist from "minimist";

/**
 * Parses command line arguments for input, output, and deleted file paths.
 * @returns {object} An object containing 'newResultsFile', 'outputTimingsFile', and 'deletedFiles'.
 */
function parseArguments() {
    const args = minimist(process.argv.slice(2), {
        alias: { n: "new", o: "out" },
        default: {
            new: "temp-test-results.json",
            out: "timing.json",
            _: [],
        },
    });
    const deletedFiles = args._.map((p) => path.resolve(p));

    return {
        newResultsFile: args.new,
        outputTimingsFile: args.out,
        deletedFiles,
    };
}

/**
 * Reads and formats raw Jest timing data from a file.
 * @param {string} filePath - The path to the raw Jest JSON results file.
 * @returns {object} An object containing formatted test results.
 * @throws {Error} If the file cannot be read, parsed, or has an invalid structure.
 */
function readAndFormatTimings(filePath) {
    if (!fs.existsSync(filePath)) {
        throw new Error(`New Jest results file not found: ${filePath}`);
    }

    const rawData = fs.readFileSync(filePath, "utf-8");
    let timingsData;
    try {
        timingsData = JSON.parse(rawData);
    } catch (parseErr) {
        throw new Error(
            `Failed to parse JSON from ${filePath}: ${parseErr.message}`,
        );
    }

    if (!timingsData.testResults || !Array.isArray(timingsData.testResults)) {
        throw new Error(
            `Invalid structure in ${filePath}, expected "testResults" array`,
        );
    }

    const formattedTestResults = timingsData.testResults.map((result) => ({
        name: result.name || "unknown",
        startTime: result.startTime || null,
        endTime: result.endTime || null,
    }));

    return { testResults: formattedTestResults };
}

/**
 * Loads existing timing data from the output file, if it exists and is valid.
 * If the file is not found or is invalid, returns an empty structure.
 * @param {string} filePath - The path to the existing timings file.
 * @returns {object} An object containing existing test results.
 */
function loadExistingTimings(filePath) {
    if (fs.existsSync(filePath)) {
        try {
            const rawData = fs.readFileSync(filePath, "utf-8");
            const existing = JSON.parse(rawData);
            if (existing.testResults && Array.isArray(existing.testResults)) {
                return existing;
            }
            console.warn(
                `Warning: Existing ${filePath} has an invalid "testResults" structure, starting fresh.`,
            );
        } catch (err) {
            console.warn(
                `Warning: Failed to parse existing ${filePath}, starting fresh. ${err.message}`,
            );
        }
    }
    return { testResults: [] };
}

/**
 * Merges new test results into existing ones, prioritizing new results for existing entries.
 * @param {object} newResults - The new test results.
 * @param {object} existingTimings - The existing test timings.
 * @param {string[]} deletedFiles - An array of paths to deleted files.
 * @returns {object} The merged and filtered test results.
 */
function mergeTimings(newResults, existingTimings, deletedFiles) {
    // Convert existing results to a map for fast lookup and easy updates
    const existingMap = new Map();
    for (const tr of existingTimings.testResults) {
        existingMap.set(path.resolve(tr.name), tr);
    }

    if (deletedFiles.length > 0) {
        // Remove deleted files from the map
        for (const deletedPath of deletedFiles) {
            if (existingMap.delete(deletedPath)) {
                console.log(
                    `Removed deleted file from timings: ${deletedPath}`,
                );
            }
        }
    } else {
        // Merge new results: if a new result is already present, update it; otherwise, add it.
        for (const newTr of newResults.testResults) {
            const absPath = path.resolve(newTr.name);
            if (!newTr.name) continue; // If the file exists in the map, update it. If not, add it.

            existingMap.set(absPath, newTr);
        }
    }
    return {
        testResults: Array.from(existingMap.values()),
    };
}

/**
 * Main function to execute the script logic.
 */
async function main() {
    const { newResultsFile, outputTimingsFile, deletedFiles } =
        parseArguments();

    try {
        // Read and format new Jest results
        const newResults =
            deletedFiles.length <= 0
                ? readAndFormatTimings(newResultsFile)
                : {
                      testResults: [],
                  };
        if (
            deletedFiles.length <= 0 &&
            (!newResults.testResults || newResults.testResults.length === 0)
        ) {
            console.warn(
                `Warning: No test results found in ${newResultsFile}. No updates will be made.`,
            );
            return;
        } // Load existing timings

        const existingTimings = loadExistingTimings(outputTimingsFile); // Merge new results into existing timings and remove deleted files

        const merged = mergeTimings(newResults, existingTimings, deletedFiles); // Save merged results

        fs.writeFileSync(outputTimingsFile, JSON.stringify(merged, null, 2));
        console.log(`Updated timings written to ${outputTimingsFile}`);
    } catch (err) {
        console.error(`Error: ${err.message}`);
        process.exit(1);
    }
}

// Execute the main function
main();
