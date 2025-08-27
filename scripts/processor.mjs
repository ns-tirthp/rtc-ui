#!/usr/bin/env node

import fs from "fs";
import path from "path";
import minimist from "minimist";

// ---- CLI Arguments ----
const args = minimist(process.argv.slice(2), {
    string: ["input", "output"],
    alias: { i: "input", o: "output", h: "help" },
    default: {
        input: "larger-timing.json",
        output: "formatted-timing.json",
    },
});

// ---- Help Message ----
if (args.help) {
    console.log(`
Usage: format-timings [options]

Options:
  -i, --input   <file>   Input Jest timings JSON file (default: larger-timing.json)
  -o, --output  <file>   Output formatted JSON file (default: formatted-timing.json)
  -h, --help             Show this help message

Example:
  node format-timings.js -i timing.json -o formatted.json
`);
    process.exit(0);
}

const inputFile = path.resolve(process.cwd(), args.input);
const outputFile = path.resolve(process.cwd(), args.output);

// ---- Main Function ----
function formatTimings() {
    try {
        if (!fs.existsSync(inputFile)) {
            console.error(`Error: Input file not found: ${inputFile}`);
            process.exit(1);
        }

        const rawData = fs.readFileSync(inputFile, "utf-8");
        let timingsData;

        try {
            timingsData = JSON.parse(rawData);
        } catch (parseErr) {
            console.error(`Error: Failed to parse JSON from ${inputFile}`);
            console.error(parseErr.message);
            process.exit(1);
        }

        if (
            !timingsData.testResults ||
            !Array.isArray(timingsData.testResults)
        ) {
            console.error(
                `Error: Invalid structure in ${inputFile}, expected "testResults" array`,
            );
            process.exit(1);
        }

        const formattedTimingData = timingsData.testResults.map((result) => ({
            name: result.name || "unknown",
            startTime: result.startTime || null,
            endTime: result.endTime || null,
        }));

        // -- Removing extra details --
        const report = {
            // -- Other fields goes here --
            testResults: formattedTimingData,
        };
        fs.writeFileSync(outputFile, JSON.stringify(report, null, 2));
        console.log(`Formatted timings written to ${outputFile}`);
    } catch (err) {
        console.error(`Unexpected error:`, err.message);
        process.exit(1);
    }
}

// ---- Run ----
formatTimings();
