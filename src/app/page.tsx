"use client";

import Configuration from "@/components/Setting";
import { StateChip } from "@/components/StatusChip";
import { Film, PlayIcon, Wifi } from "lucide-react";
import useWebRTC from "@/hooks/useWebRTC";
import { MediaStreamStatistics } from "@/components/Statistics/MediaStream";
import { DataChannelStatistics } from "@/components/Statistics/DataChannel";

export default function Home() {
    const {
        peerId,
        packets,
        testMode,
        statistics,
        setTestMode,
        initiateTest,
        connectionState,
        dataChannelState,
    } = useWebRTC();

    return (
        <div className="flex flex-col justify-center items-center">
            <div className="flex gap-4 mt-6">
                <div className="bg-white rounded-full p-1 flex items-center justify-center mb-6 shadow-md">
                    <button
                        className={`px-6 py-3 rounded-full text-lg font-semibold flex items-center transition-all duration-300
                                ${testMode === "DataChannel" ? "bg-blue-600 text-white shadow-lg" : "text-gray-700 hover:bg-gray-200"}`}
                        onClick={() => setTestMode("DataChannel")}
                    >
                        <Wifi className="mr-2" size={20} />
                        DataChannel
                    </button>
                    <button
                        className={`px-6 py-3 rounded-full text-lg font-semibold flex items-center transition-all duration-300
                                ${testMode === "VideoStream" ? "bg-blue-600 text-white shadow-lg" : "text-gray-700 hover:bg-gray-200"}`}
                        onClick={() => setTestMode("VideoStream")}
                    >
                        <Film className="mr-2" size={20} />
                        Video/Audio Stream
                    </button>
                </div>
            </div>
            {testMode === "DataChannel" ? (
                <Configuration></Configuration>
            ) : null}
            <div className="fixed bottom-8 right-8 flex items-center space-x-3 w-min whitespace-nowrap">
                <StateChip state={connectionState}></StateChip>
            </div>
            <div className="fixed top-2 right-2 flex items-center space-x-3 w-min whitespace-nowrap">
                <p className="text-xs text-black">{peerId}</p>
            </div>
            {testMode === "VideoStream" ? (
                <MediaStreamStatistics
                    statistics={statistics}
                ></MediaStreamStatistics>
            ) : (
                <DataChannelStatistics
                    statistics={statistics}
                    packets={packets}
                    dataChannelStatus={dataChannelState}
                ></DataChannelStatistics>
            )}
            <button
                className="mt-8 px-8 py-4 bg-blue-600 text-white text-xl font-bold rounded-full shadow-lg
                           hover:bg-blue-700 transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-blue-500 focus:ring-opacity-50"
                onClick={() => {
                    initiateTest();
                }}
            >
                <div className="flex">
                    <PlayIcon className="mr-2 text-white" size={24} />{" "}
                    <p className="text-white">Start Test</p>
                </div>
            </button>
        </div>
    );
}
