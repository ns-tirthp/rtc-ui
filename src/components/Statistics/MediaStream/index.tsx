import { MayBe } from "@/hooks/types";
import { currentFormattedDate } from "@/utils/helper";
import { Activity, AlertTriangle } from "lucide-react";
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

export const MediaStreamStatistics = ({
    statistics,
}: {
    statistics: MayBe<RTCStatsReport>;
}) => {
    const [data, setData] = useState<{ time: string; packetsLost: number }[]>(
        [],
    );
    const [window, setWindow] = useState<
        { time: string; packetsLost: number }[]
    >([]);
    const [packetsSent, setPacketsSent] = useState<number>(0);

    useEffect(() => {
        if (!statistics) return;
        statistics.forEach((report) => {
            if (
                report.kind === "video" &&
                report.type === "remote-inbound-rtp"
            ) {
                setData((prev) => [
                    ...prev,
                    {
                        time: currentFormattedDate(),
                        packetsLost: report.packetsLost,
                    },
                ]);
            }
            if (report.type === "outbound-rtp") {
                setPacketsSent(report.packetsSent);
            }
        });
    }, [statistics]);

    const packetLoss = useMemo(() => {
        const { packetsLost } = window.at(-1) ?? {
            packetsLost: 0,
            packetsReceived: 0,
        };
        if (packetsSent === 0) return 0;
        return ((packetsLost ?? 0) / packetsSent) * 100;
    }, [window, packetsSent]);

    useEffect(() => {
        setWindow(data.slice(-20));
    }, [data]);

    return (
        <div className="flex gap-4">
            <div className="bg-white p-6 rounded-xl shadow-lg flex-shrink-0 w-full sm:w-72 md:w-1/2 flex flex-col justify-between">
                <div className="flex items-center mb-4">
                    <Activity className="mr-2 text-purple-600" size={24} />
                    <h3 className="text-xl font-bold text-gray-800">
                        Packet Loss Over Time
                    </h3>
                </div>
                <div className="w-full h-48">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                            data={window}
                            margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
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
                                dataKey="packetsLost"
                                stroke="#8884d8" // A distinct color for the line
                                activeDot={{ r: 8 }}
                                name="Packet Loss (%)"
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
                <p className="text-sm text-gray-600 mt-4 text-center">
                    Historical trend of simulated packet loss.
                </p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-lg flex-shrink-0 w-full sm:w-72 md:w-80 lg:w-96 flex flex-col justify-between items-center">
                <div className="flex items-center mb-4">
                    <AlertTriangle className="mr-2 text-red-500" size={24} />
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
                                    loss: packetLoss,
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
                            <RadialBar background dataKey="loss" />
                            {/* Custom Text Label in the Center of the Chart */}
                            <text
                                x="50%"
                                y="50%"
                                textAnchor="middle"
                                dominantBaseline="middle"
                                className="text-4xl font-bold"
                                fill="#ef4444" // Red color for the text
                            >
                                {packetLoss.toFixed(1)}%
                            </text>
                        </RadialBarChart>
                    </ResponsiveContainer>
                </div>
                <p className="text-sm text-gray-600 mt-4 text-center">
                    This chart shows the simulated packet loss percentage.
                </p>
            </div>

            <div className="flex flex-col gap-2">
                <div className="bg-white p-6 h-fit rounded-xl shadow-lg flex-shrink-0 w-full sm:w-72 md:w-80 lg:w-96 flex flex-col justify-between items-center">
                    <div className="flex gap-4 text-blue-400">
                        <div className="text-lg mb-2">
                            <p className="font-semibold">Total Packets</p>
                            <p className="text-2xl font-bold">{packetsSent}</p>
                        </div>
                        <div className="text-lg">
                            <p className="font-semibold">Total Lost</p>
                            <p className="text-2xl font-bold">
                                {window.at(-1)?.packetsLost ?? 0}
                            </p>
                        </div>
                    </div>
                </div>
                <div
                    id="#videoSource"
                    className="rounded-3xl h-full w-full flex justify-center items-center"
                ></div>
            </div>
        </div>
    );
};
