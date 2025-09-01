import { packDataWithSequenceNumber } from "@/utils/helper";
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
