import path from "path";

const proccessing = (results) => {
    results.testResults.forEach((testResult) => {
        testResult.testFilePath = path.relative(
            process.cwd(),
            testResult.testFilePath,
        );
    });
    return results;
};

export default proccessing;
