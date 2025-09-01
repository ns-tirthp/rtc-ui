import { extractSequenceNumber } from "@/utils/helper";

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
