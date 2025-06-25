export type Maybe<T> = T | null;

export type Message =
    | RTCSessionDescriptionInit
    | { type: "peerId"; peerId: string }
    | { type: "iceCandidate"; candidate: RTCIceCandidateInit[] }
    | { type: "dataChannel"; data: string }
    | { type: "error"; data: string };

export interface RTCMediaStatistics extends Partial<RTCInboundRtpStreamStats> {
    time: string;
}
export interface DataChannelStatistics {
    time: string;
    bytesReceived: number;
    messagesReceived: number;
}

export const DataChannelMessage = {
    init(configuration: string) {
        return JSON.stringify({
            type: "dataChannel",
            data: `SEND PREP ${configuration}`,
        });
    },
    ready() {
        return JSON.stringify({
            type: "dataChannel",
            data: "SEND START",
        });
    },
};
