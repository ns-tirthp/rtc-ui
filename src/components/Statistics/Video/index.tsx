import { Activity } from "lucide-react";
import { useEffect, useState } from "react";
import {
    ResponsiveContainer,
    XAxis,
    YAxis,
    Tooltip,
    Legend,
    Line,
    LineChart,
} from "recharts";

export const RTCNetworkStatics = ({
    data,
}: {
    data: { time: string; loss: number }[];
}) => {
    const [history, setHistory] = useState<{ time: string; loss: number }[]>(
        [],
    );
    useEffect(() => {
        setHistory(data.slice(-20));
    }, [data]);
    return (
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
                        data={history}
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
                            dataKey="loss"
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
    );
};
