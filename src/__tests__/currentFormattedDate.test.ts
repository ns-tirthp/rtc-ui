import { currentFormattedDate } from "@/utils/helper";

describe("currentFormattedDate", () => {
    it("returns formatted time string", () => {
        const result = currentFormattedDate();
        // Format is "HH:MM:SS AM/PM"
        expect(result).toMatch(/\d{2}:\d{2}:\d{2}/);
    });
});
