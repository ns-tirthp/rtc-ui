import { convertBytes } from "@/utils/helper";

describe("convertBytes", () => {
    it("returns default when bytes is undefined or 0", () => {
        expect(convertBytes()).toEqual({
            convertedValue: 0,
            convertedUnit: "B",
        });
        expect(convertBytes(0)).toEqual({
            convertedValue: 0,
            convertedUnit: "B",
        });
    });

    it("converts bytes to default appropriate unit", () => {
        expect(convertBytes(500)).toEqual({
            convertedValue: 500,
            convertedUnit: "B",
        });
        expect(convertBytes(1500)).toEqual({
            convertedValue: 1.5,
            convertedUnit: "KB",
        });
        expect(convertBytes(2_000_000)).toEqual({
            convertedValue: 2,
            convertedUnit: "MB",
        });
        expect(convertBytes(3_500_000_000)).toEqual({
            convertedValue: 3.5,
            convertedUnit: "GB",
        });
    });

    it("converts bytes to explicitly passed unit", () => {
        expect(convertBytes(1024, "KB", 2)).toEqual({
            convertedValue: 1.02,
            convertedUnit: "KB",
        });
        expect(convertBytes(1024 * 1024, "MB", 0)).toEqual({
            convertedValue: 1,
            convertedUnit: "MB",
        });
    });

    it("respects fractionDigits", () => {
        const res = convertBytes(1234, "KB", 3);
        expect(
            res.convertedValue.toString().split(".")[1].length,
        ).toBeLessThanOrEqual(3);
    });
});
