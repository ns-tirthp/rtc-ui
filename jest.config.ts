module.exports = {
    testEnvironment: "jsdom",
    testResultsProcessor: "./postProcessor.js",
    moduleNameMapper: {
        "next/font/google": "<rootDir>/__mocks__/next/font/google.js",
        "^@/.*\\.(css|less|scss|sass)$": "<rootDir>/__mocks__/fileMock.js",
        "\\.(css|less|scss|sass)$": "<rootDir>/__mocks__/fileMock.js",
        "^@/(.*)$": "<rootDir>/src/$1",
        "^.+\\.(png|jpg|jpeg|gif|webp|svg)$": "<rootDir>/__mocks__/fileMock.js",
    },
    transform: {
        "^.+\\.(ts|tsx|js|jsx)$": [
            "ts-jest",
            { tsconfig: "tsconfig.jest.json" },
        ],
    },
    transformIgnorePatterns: [
        "/node_modules/(?!(lodash-es|@bugsnag/browser-performance|@bugsnag/core-performance|@bugsnag/delivery-fetch-performance|@bugsnag/request-tracker-performance)/)",
        "/.next/",
    ],
    testPathIgnorePatterns: ["/node_modules/", "/.next/"],
    collectCoverageFrom: [
        "src/**/*.{ts,tsx}",
        "!src/**/*.d.ts",
        "!src/**/types.ts",
    ],
};
