export type MayBe<T> = T | null;

export type PeerIdExchange = {
    type: "peerId";
    peerId: string;
};

export type RTCIceCandidateExchange = {
    type: "iceCandidate";
    candidate: RTCIceCandidateInit[];
};

export type Message =
    | RTCSessionDescriptionInit
    | RTCIceCandidateExchange
    | PeerIdExchange;
