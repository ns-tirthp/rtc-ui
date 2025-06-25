import { PacketReceptionHeatmap } from "@/components/HeatMap";
import { useGlobalStore } from "@/context/GlobalStore";
import { Maybe } from "@/hooks/types";
import {
    convertBytes,
    currentFormattedDate,
    findMissingSequenceNumber,
} from "@/utils/helper";
import {
    Activity,
    AlertTriangle,
    ChevronDown,
    LineChart as LCIcon,
    WifiOff,
    XCircle,
    History,
    Zap,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
    ResponsiveContainer,
    XAxis,
    YAxis,
    Tooltip,
    Legend,
    Line,
    LineChart,
    PolarAngleAxis,
    RadialBar,
    RadialBarChart,
} from "recharts";

type DataChannelStats = {
    time: string;
    bytesReceived: number;
    messagesReceived: number;
};
const TestSeverity = ({ totalDataInBytes }: { totalDataInBytes: number }) => {
    const KILOBYTE = 1024;
    const MEGABYTE = 1024 * KILOBYTE;

    let severity;
    if (totalDataInBytes <= 100 * KILOBYTE) {
        // Up to 100 KB
        severity = {
            level: "Low",
            colorClass: "bg-green-100 text-green-700",
            icon: <ChevronDown className="h-4 w-4 mr-1" />,
        };
    } else if (totalDataInBytes <= 1 * MEGABYTE) {
        // 100 KB to 1 MB
        severity = {
            level: "Medium",
            colorClass: "bg-yellow-100 text-yellow-700",
            icon: <AlertTriangle className="h-4 w-4 mr-1" />,
        };
    } else if (totalDataInBytes <= 10 * MEGABYTE) {
        // 1 MB to 10 MB
        severity = {
            level: "High",
            colorClass: "bg-orange-100 text-orange-700",
            icon: <XCircle className="h-4 w-4 mr-1" />,
        };
    } else {
        // Greater than 10 MB
        severity = {
            level: "Severe",
            colorClass: "bg-red-100 text-red-700",
            icon: <Zap className="h-4 w-4 mr-1" />,
        };
    }
    return (
        <div className="flex flex-col gap-2">
            <div
                className={`flex items-center px-3 py-1 rounded-full text-sm font-semibold w-fit ${severity.colorClass}`}
            >
                {severity.icon}
                <span>{severity.level}</span>
            </div>
        </div>
    );
};

// PacketIssueList Component (New Component for Lost/Late Packets)
const PacketIssueList = ({
    title,
    Icon,
    packets,
    typeColorClass,
}: {
    title: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Icon: any;
    packets: (number | bigint)[];
    typeColorClass: string;
}) => {
    // Determine the background and text color for chips based on typeColorClass
    const chipBgClass =
        typeColorClass === "text-red-500" ? "bg-red-100" : "bg-yellow-100";
    const chipTextClass =
        typeColorClass === "text-red-500" ? "text-red-700" : "text-yellow-700";

    return (
        <div className="bg-white p-6 rounded-xl shadow-lg flex-shrink-0 w-full sm:w-72 md:w-80 lg:w-96 flex flex-col justify-between">
            <div className="flex items-center mb-4">
                {Icon && (
                    <Icon className={`mr-2 ${typeColorClass}`} size={24} />
                )}
                <h3 className="text-xl font-bold text-gray-800">{title}</h3>
            </div>
            <div className="max-h-[78px] overflow-y-auto border border-gray-200 rounded-lg p-2 bg-gray-50">
                {" "}
                {/* Removed custom-scrollbar class from here */}
                {packets.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                        {packets.map((seq) => (
                            <span
                                key={seq} // Use sequence number as key if unique, otherwise use index if duplicates are possible in the displayed list
                                className={`px-3 py-1 rounded-full text-sm font-medium ${chipBgClass} ${chipTextClass}`}
                                title={`Packet Sequence: ${seq}`}
                            >
                                #{seq}
                            </span>
                        ))}
                    </div>
                ) : (
                    <p className="text-gray-500 text-center py-4 flex justify-center">
                        No {title.toLowerCase()} recorded.
                    </p>
                )}
            </div>
            <p className="text-sm text-gray-600 mt-4 text-center">
                Showing up to {packets.length} recent {title.toLowerCase()}{" "}
                sequence numbers.
            </p>
            {/* Custom Scrollbar Styling - Moved to a global style or external CSS if truly needed, as inline <style jsx> caused issues */}
        </div>
    );
};
export const DataChannelStatistics = ({
    statistics,
    packets,
    dataChannelStatus,
}: {
    statistics: Maybe<RTCStatsReport>;
    packets: {
        sendAt: bigint;
        receivedAt: bigint;
        sequenceNumber: number;
    }[];
    dataChannelStatus: "new" | "opened" | "inprogress" | "closed";
}) => {
    const {
        frequency,
        duration,
        acceptableDelay,
        expectedTotalByt,
        expectedTotalMsg,
    } = useGlobalStore();
    const [data, setData] = useState<DataChannelStats[]>([]);

    useEffect(() => {
        if (!statistics) return;
        statistics.forEach((report) => {
            if (report.type === "data-channel") {
                setData((prev) => [
                    ...prev,
                    {
                        time: currentFormattedDate(),
                        messagesReceived: report.messagesReceived,
                        bytesReceived: report.bytesReceived,
                    },
                ]);
            }
        });
    }, [statistics]);

    const formattedTotalBytes = useMemo(() => {
        const { convertedValue, convertedUnit } =
            convertBytes(expectedTotalByt);
        return `${convertedValue} ${convertedUnit}`;
    }, [expectedTotalByt]);

    const calculatedPacketLoss = useMemo(() => {
        if (dataChannelStatus !== "closed") return 0;
        const received = data.at(-1)?.messagesReceived ?? 0;
        return ((expectedTotalMsg - received) * 100) / expectedTotalMsg;
    }, [expectedTotalMsg, data, dataChannelStatus]);

    const missingPacketNumbers = useMemo(() => {
        if (dataChannelStatus !== "closed") return [];
        return findMissingSequenceNumber(
            expectedTotalMsg,
            packets.map((data) => data.sequenceNumber),
        );
    }, [expectedTotalMsg, packets, dataChannelStatus]);

    const delayedPackets = useMemo(() => {
        return packets
            .filter((data) => data.receivedAt - data.sendAt > acceptableDelay)
            .map((data) => data.sequenceNumber);
    }, [packets, acceptableDelay]);

    return (
        <div className="flex items-start">
            <div className="flex flex-wrap justify-center gap-6 p-4">
                <div className="bg-blue-500 text-white p-6 rounded-xl shadow-lg flex-shrink-0 w-full sm:w-72 md:w-80 lg:w-96 flex flex-col justify-between">
                    <div className="flex items-center mb-4">
                        <LCIcon className="mr-2" size={24} />
                        <h3 className="text-xl font-bold">Data Summary</h3>
                    </div>
                    <p className="text-justify">
                        Server will send total {expectedTotalMsg} packets at
                        rate of {frequency} packets per second in span of total{" "}
                        {duration} seconds
                    </p>
                    <div className="flex flex-col gap-2">
                        <p className="font-semibold text-lg">Test Type</p>
                        <TestSeverity totalDataInBytes={expectedTotalByt} />
                    </div>
                    <div className="flex gap-4">
                        <div className="text-lg mb-2">
                            <p className="font-semibold">Total Packets</p>
                            <p className="text-2xl font-bold">
                                {expectedTotalMsg}
                            </p>
                        </div>
                        <div className="text-lg">
                            <p className="font-semibold">Total Bytes</p>
                            <p className="text-2xl font-bold">
                                {formattedTotalBytes}
                            </p>
                        </div>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-lg flex-shrink-0 w-full sm:w-72 md:w-80 lg:w-96 flex flex-col justify-between items-center">
                    <div className="flex items-center mb-4">
                        <AlertTriangle
                            className="mr-2 text-red-500"
                            size={24}
                        />
                        <h3 className="text-xl font-bold text-gray-800">
                            Packet Loss
                        </h3>
                    </div>
                    <div className="w-full h-48 flex items-center justify-center">
                        {" "}
                        {/* Set a fixed height for the chart container */}
                        <ResponsiveContainer width="100%" height="100%">
                            <RadialBarChart
                                innerRadius="70%"
                                outerRadius="90%"
                                barSize={20} // Thickness of the bar
                                data={[
                                    {
                                        received: calculatedPacketLoss,
                                        fill: "#ef4444",
                                    },
                                ]}
                                startAngle={90} // Start from the top
                                endAngle={-270} // Go full circle (360 degrees clockwise)
                            >
                                {/* Hidden axis for proper scaling */}
                                <PolarAngleAxis
                                    type="number"
                                    domain={[0, 100]}
                                    angleAxisId={0}
                                    tick={false}
                                />
                                <RadialBar background dataKey="received" />
                                {/* Custom Text Label in the Center of the Chart */}
                                <text
                                    x="50%"
                                    y="50%"
                                    textAnchor="middle"
                                    dominantBaseline="middle"
                                    className="text-4xl font-bold"
                                    fill="#ef4444" // Red color for the text
                                >
                                    {calculatedPacketLoss.toFixed(1)}%
                                </text>
                            </RadialBarChart>
                        </ResponsiveContainer>
                    </div>
                    <p className="text-sm text-gray-600 mt-4 text-center">
                        This chart shows the simulated packet loss percentage.
                    </p>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-lg flex-shrink-0 w-full sm:w-72 md:w-80 lg:w-96 flex flex-col justify-between">
                    <div className="flex items-center mb-4">
                        <Activity className="mr-2 text-purple-600" size={24} />
                        <h3 className="text-xl font-bold text-gray-800">
                            Packets Received Over Time
                        </h3>
                    </div>
                    <div className="w-full h-48">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart
                                data={data.slice(-20)}
                                margin={{
                                    top: 5,
                                    right: 10,
                                    left: 0,
                                    bottom: 5,
                                }}
                            >
                                <XAxis
                                    dataKey="time"
                                    hide={true}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <YAxis
                                    domain={[0, 100]}
                                    hide={false}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <Tooltip />
                                <Legend
                                    wrapperStyle={{
                                        marginBottom: -20,
                                    }}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="messagesReceived"
                                    stroke="#8884d8" // A distinct color for the line
                                    activeDot={{ r: 8 }}
                                    name="Packets Received"
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                    <p className="text-sm text-gray-600 mt-4 text-center">
                        Historical trend of packets received.
                    </p>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-lg flex-shrink-0 w-full sm:w-72 md:w-80 lg:w-96 flex flex-col justify-between">
                    <div className="flex items-center mb-4">
                        <Activity className="mr-2 text-purple-600" size={24} />
                        <h3 className="text-xl font-bold text-gray-800">
                            Bytes Received Over Time
                        </h3>
                    </div>
                    <div className="w-full h-48">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart
                                data={data.slice(-20)}
                                margin={{
                                    top: 5,
                                    right: 10,
                                    left: 0,
                                    bottom: 5,
                                }}
                            >
                                <XAxis
                                    dataKey="time"
                                    hide={true}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <YAxis
                                    domain={[0, 100]}
                                    hide={false}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <Tooltip />
                                <Legend
                                    wrapperStyle={{
                                        marginBottom: -20,
                                    }}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="bytesReceived"
                                    stroke="#8884d8" // A distinct color for the line
                                    activeDot={{ r: 8 }}
                                    name="Bytes Received"
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                    <p className="text-sm text-gray-600 mt-4 text-center">
                        Historical trend of bytes received.
                    </p>
                </div>
                <PacketReceptionHeatmap
                    receivedSequenceNumbers={packets.map(
                        (d) => d.sequenceNumber,
                    )}
                    totalCells={expectedTotalMsg}
                ></PacketReceptionHeatmap>
                <div className="flex flex-col gap-4">
                    <PacketIssueList
                        title="Lost Packets"
                        Icon={WifiOff}
                        packets={missingPacketNumbers}
                        typeColorClass="text-red-500"
                    />
                    <PacketIssueList
                        title="Late Packets"
                        Icon={History} // Using History icon for late packets
                        packets={delayedPackets}
                        typeColorClass="text-yellow-500"
                    />
                </div>
            </div>
        </div>
    );
};
