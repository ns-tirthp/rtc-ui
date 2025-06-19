export type SizeUnit = "B" | "KB" | "MB" | "GB";
/**
 * Converts passed bytes to more human human-readable format (Bytes, KB (Kilo-Bytes),MB (Mega-Bytes),GB (Giga-Bytes))
 *
 * @param {number} bytes - The number in bytes to convert
 * @param {SizeUnit} unit - If passed function will convert bytes to passed unit.
 * @param {number} fractionDigits - The number of decimal places to include in the output.
 * @returns {{ convertedValue: number; convertedUnit: string }} An object containing the converted speed and its unit.
 */
export function convertBytes(
    bytes?: number,
    unit?: SizeUnit,
    fractionDigits: number = 4,
) {
    const units: SizeUnit[] = ["B", "KB", "MB", "GB"];
    const defaultReturn = { convertedValue: 0, convertedUnit: units[0] };
    if (!bytes) return defaultReturn;
    const unitIndex = unit
        ? units.findIndex((u) => u === unit)
        : Math.floor(Math.log10(bytes) / 3);
    const convertedSpeed = bytes / Math.pow(10, unitIndex * 3);
    return {
        convertedValue: Number(convertedSpeed.toFixed(fractionDigits)),
        convertedUnit: unit ?? units[unitIndex],
    };
}

/**
 * Extracts the sequence number from the beginning of a received ArrayBuffer.
 *
 * @param {ArrayBuffer} receivedBuffer - The ArrayBuffer received from the RTCDataChannel.
 * @param {number} sequenceNumberSize - The size of the sequence number in bytes (e.g., 4 for Uint32).
 * @returns {number} The extracted sequence number.
 * @throws {Error} If the buffer is too small to contain a sequence number.
 */
export function extractSequenceNumber(
    receivedBuffer: ArrayBuffer,
    sequenceNumberSize = 4,
): number {
    if (!(receivedBuffer instanceof ArrayBuffer)) {
        throw new Error("Input must be an ArrayBuffer.");
    }
    if (receivedBuffer.byteLength < sequenceNumberSize) {
        throw new Error(
            `Received buffer is too small (${receivedBuffer.byteLength} bytes) to contain a ${sequenceNumberSize}-byte sequence number.`,
        );
    }

    // Create a DataView to read data from the buffer
    const view = new DataView(receivedBuffer);

    // Read the sequence number from the beginning (offset 0)
    // Use 'false' for big-endian, consistent with the packing function.
    const sequenceNumber = view.getUint32(0, false);

    return sequenceNumber;
}

export function findMissingSequenceNumber(
    totalSequenceLength: number,
    receviedSequences: number[],
) {
    const allSequences = Array(totalSequenceLength)
        .fill(0)
        .map((_, i) => i);
    return allSequences.filter(
        (d: number) => receviedSequences.find((e) => e == d) === undefined,
    );
}

/**
 * Packs a sequence number and dummy data (0xAA) into a fixed-size ArrayBuffer.
 * The buffer will be filled with the sequence number at the beginning,
 * and the remaining space will be filled with the specified dummy byte (0xAA).
 *
 * @param {number} sequenceNumber - The sequence number to include in the packet.
 * @param {number} fixedPacketSize - The total desired size of the packet in bytes (B).
 * @param {number} sequenceNumberSize - The size of the sequence number in bytes (e.g., 4 for Uint32).
 * @returns {ArrayBuffer} A new ArrayBuffer of fixedPacketSize containing the sequence number and dummy data.
 * @throws {Error} If fixedPacketSize is not greater than sequenceNumberSize.
 */
export function packDataWithSequenceNumber(
    sequenceNumber: number,
    fixedPacketSize: number,
    sequenceNumberSize = 4,
) {
    if (fixedPacketSize <= sequenceNumberSize) {
        throw new Error(
            "Fixed packet size must be greater than sequence number size.",
        );
    }

    // 1. Create a new ArrayBuffer of the fixed size
    const buffer = new ArrayBuffer(fixedPacketSize);
    // 2. Create a DataView to write data into the buffer with byte-level precision
    const view = new DataView(buffer);

    // 3. Write the sequence number at the beginning (offset 0)
    // Using setUint32 for a 4-byte sequence number.
    // 'false' indicates big-endian byte order (most common for network protocols).
    view.setUint32(0, sequenceNumber, false);

    // 4. Fill the rest of the buffer with dummy data (0xAA)
    const payloadOffset = sequenceNumberSize;
    const bytesToFill = fixedPacketSize - sequenceNumberSize;

    // Create a Uint8Array view starting after the sequence number
    const dummyBytesArray = new Uint8Array(buffer, payloadOffset, bytesToFill);

    // Fill every byte in this section with 0xAA
    for (let i = 0; i < bytesToFill; i++) {
        dummyBytesArray[i] = 0xaa;
    }

    return buffer;
}
