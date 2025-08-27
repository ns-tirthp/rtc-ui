import distribute from "../shard";
import fs from "fs";

jest.spyOn(fs, "existsSync").mockReturnValue(true);

const TIMINGS_DATA = {
    testResults: [
        {
            name: "a",
            startTime: 10,
            endTime: 20,
        },
        {
            name: "b",
            startTime: 10,
            endTime: 30,
        },
        {
            name: "c",
            startTime: 10,
            endTime: 40,
        },
        {
            name: "d",
            startTime: 10,
            endTime: 50,
        },
    ],
};
describe("Shard", () => {
    beforeEach(() => {
        jest.spyOn(fs, "readFileSync").mockReturnValue(
            JSON.stringify(TIMINGS_DATA),
        );
    });
    it.each([
        { index: 1, shards: 2, expected: "d a" },
        { index: 2, shards: 2, expected: "c b" },
        { index: 1, shards: 1, expected: "d c b a" },
    ])("should distribute tests correctly", ({ index, shards, expected }) => {
        const result = distribute({ index, shards });
        expect(result).toBe(expected);
    });
});
