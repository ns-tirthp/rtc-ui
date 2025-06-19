import { BanIcon, Blocks } from "lucide-react";
import { useMemo } from "react";

export const PacketReceptionHeatmap = ({
    receivedSequenceNumbers,
    totalCells = 100,
}: {
    receivedSequenceNumbers: number[];
    totalCells: number;
}) => {
    // Memoize cells generation to avoid re-calculating on every render if props haven't changed
    const cells = useMemo(() => {
        const allCells = Array.from({ length: totalCells }, (_, i) => ({
            sequence: i,
            received: false, // Default to not received
        }));

        // Mark received packets
        receivedSequenceNumbers.forEach((seq) => {
            if (seq >= 0 && seq < totalCells) {
                allCells[seq].received = true;
            }
        });
        return allCells;
    }, [receivedSequenceNumbers, totalCells]);

    // Determine grid dimensions
    const cols = Math.ceil(Math.sqrt(totalCells));
    const rows = Math.ceil(totalCells / cols);

    return (
        <div className="bg-white p-6 rounded-xl shadow-lg flex-shrink-0 w-full sm:w-72 md:w-80 lg:w-96 flex flex-col items-center justify-between">
            <div className="flex items-center mb-4">
                <Blocks className="mr-2 text-purple-600" size={24} />
                <h3 className="text-xl font-bold text-gray-800">
                    Packet Reception Heatmap
                </h3>
            </div>
            {totalCells <= 300 ? (
                <div
                    className="grid gap-px p-2 border border-gray-200 rounded-lg"
                    style={{
                        gridTemplateColumns: `repeat(${cols}, minmax(0, 0.5fr))`,
                        gridTemplateRows: `repeat(${rows}, minmax(0, 0.5fr))`,
                        width: "100%",
                        maxWidth: "300px", // Limit overall heatmap size for better visibility
                        aspectRatio: "1 / 1", // Keep it square
                    }}
                >
                    {cells.map((cell) => (
                        <div
                            key={cell.sequence}
                            className={`w-full h-4 rounded-sm transition-colors duration-100 ease-in-out
                                    ${cell.received ? "bg-green-500" : "bg-gray-300"}`}
                            title={`Packet ${cell.sequence}: ${cell.received ? "Received" : "Lost"}`}
                        ></div>
                    ))}
                </div>
            ) : (
                <div className="flex gap-2 font-semibold text-red-600 justify-center items-center">
                    <BanIcon size={20} />
                    <p>Too large to render</p>
                </div>
            )}
            {totalCells <= 300 ? (
                <p className="text-sm text-gray-600 mt-4 text-center">
                    Green: Received Packets, Gray: Lost/Unreceived Packets.
                    <br />
                    (Visualizing packets 0 to {totalCells - 1})
                </p>
            ) : (
                <div className="w-full flex items-start">
                    Total Received: {receivedSequenceNumbers.length}
                </div>
            )}
        </div>
    );
};
