import fs from "fs";
import path from "path";

const filePath = path.resolve("test-result.json");

function writeSummary(output) {
    console.log(output); // still print to console

    const summaryFile = process.env.GITHUB_STEP_SUMMARY;
    if (summaryFile) {
        fs.appendFileSync(summaryFile, output + "\n");
    }
}
function printSummary(results) {
    const {
        numTotalTestSuites,
        numPassedTestSuites,
        numFailedTestSuites,
        numTotalTests,
        numPassedTests,
        numFailedTests,
        testResults,
    } = results;

    writeSummary("\n========== JEST TEST SUMMARY ==========\n");

    writeSummary(` Test Suites : Total ${numTotalTestSuites} | Passed ${numPassedTestSuites} | Failed ${numFailedTestSuites}`);
    writeSummary(` Test Cases  : Total ${numTotalTests} | Passed ${numPassedTests} | Failed ${numFailedTests}\n`);

    if (numFailedTestSuites > 0) {
        console.log("❌ Failed Test Suites & Cases:\n");
        testResults
            .filter((suite) => suite.status === "failed")
            .forEach((suite) => {
                writeSummary(` Suite: ${suite.name}`);
                suite.assertionResults
                    .filter((test) => test.status === "failed")
                    .forEach((test) => {
                        console.log(`   ✗ ${test.fullName}`);
                    });
                console.log();
            });
    } else {
        writeSummary("✅ All test suites passed!\n");
    }

    writeSummary("=======================================\n");

    // Exit code for CI/CD
    if (numFailedTests > 0) {
        process.exit(1);
    }
}

function main() {
    try {
        const data = fs.readFileSync(filePath, "utf-8");
        const results = JSON.parse(data);
        printSummary(results);
    } catch (err) {
        console.error("Error reading test-result.json:", err.message);
        process.exit(1);
    }
}

main();
