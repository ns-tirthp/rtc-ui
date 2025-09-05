import { findMissingSequenceNumber } from "@/utils/helper";

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
