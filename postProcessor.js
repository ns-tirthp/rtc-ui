import path from "path";

module.exports = (results) => {
    results.testResults.forEach((testResult) => {
        testResult.testFilePath = path.relative(
            process.cwd(),
            testResult.testFilePath,
        );
    });
    return results;
};
