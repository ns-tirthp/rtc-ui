import {
    convertBytes,
    extractSequenceNumber,
    findMissingSequenceNumber,
    packDataWithSequenceNumber,
    currentFormattedDate,
} from "@/utils/helper";

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

describe("extractSequenceNumber", () => {
    it("throws if input is not ArrayBuffer", () => {
        // @ts-expect-error forcing wrong type
        expect(() => extractSequenceNumber("not-buffer")).toThrow(
            "Input must be an ArrayBuffer.",
        );
    });

    it("throws if buffer is too small", () => {
        expect(() => extractSequenceNumber(new ArrayBuffer(2), 4)).toThrow(
            /too small/,
        );
    });

    it("extracts sequence number from buffer", () => {
        const buffer = new ArrayBuffer(8);
        const view = new DataView(buffer);
        view.setUint32(0, 12345, false); // big-endian
        expect(extractSequenceNumber(buffer, 4)).toBe(12345);
    });
});

describe("findMissingSequenceNumber", () => {
    it("finds missing numbers", () => {
        expect(findMissingSequenceNumber(5, [0, 1, 3])).toEqual([2, 4]);
    });

    it("returns empty array when none missing", () => {
        expect(findMissingSequenceNumber(3, [0, 1, 2])).toEqual([]);
    });

    it("returns all when none received", () => {
        expect(findMissingSequenceNumber(4, [])).toEqual([0, 1, 2, 3]);
    });
});

describe("packDataWithSequenceNumber", () => {
    it("throws when fixedPacketSize <= sequenceNumberSize", () => {
        expect(() => packDataWithSequenceNumber(1, 4, 4)).toThrow(
            "Fixed packet size must be greater than sequence number size.",
        );
    });

    it("packs sequence number and fills rest with 0xAA", () => {
        const buffer = packDataWithSequenceNumber(42, 10, 4);
        const view = new DataView(buffer);
        expect(view.getUint32(0, false)).toBe(42);

        const payload = new Uint8Array(buffer, 4);
        expect(payload.every((b) => b === 0xaa)).toBe(true);
    });
});

describe("currentFormattedDate", () => {
    it("returns formatted time string", () => {
        const result = currentFormattedDate();
        // Format is "HH:MM:SS AM/PM"
        expect(result).toMatch(/\d{2}:\d{2}:\d{2}/);
    });
});
