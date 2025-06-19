import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MayBe, Message } from "./types";
import { useGlobalStore } from "@/context/GlobalStore";

export default function useRTC() {
    const { frequency, packetSize, duration } = useGlobalStore();

    const pcRef = useRef<MayBe<RTCPeerConnection>>(null); // Peer Connection Ref
    const dcRef = useRef<MayBe<RTCDataChannel>>(null); // Data Channel Ref
    const wsRef = useRef<MayBe<WebSocket>>(null); // WebSocket Connection Ref
    const icRef = useRef<MayBe<RTCIceCandidate[]>>([]);
    const vuRef = useRef<MayBe<MediaStream>>(null);
    const siRef = useRef<MayBe<NodeJS.Timeout>>(null);

    const [peerId, setPeerId] = useState<MayBe<string>>(null);

    const signalingServerUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
    const [connectionState, setConnectionState] =
        useState<RTCPeerConnectionState>("new");

    const messagesRef = useRef<
        MayBe<({ receivedAt: bigint; data: ArrayBuffer } | string)[]>
    >([]);
    const [sequenceReceived, setSequenceReceived] = useState<number[]>([]);
    const [packets, setPackets] = useState<
        {
            sendAt: bigint;
            receivedAt: bigint;
            sequenceNumber: number;
        }[]
    >([]);
    const [mediaStreamStats, setMediaStreamStats] = useState<
        { time: string; loss: number }[]
    >([]);

    const [dataChannelStats, setDataChannelStats] = useState<
        {
            time: string;
            bytesReceived: number;
            packetsReceived: number;
        }[]
    >([{ bytesReceived: 0, packetsReceived: 0, time: "" }]);

    const [testMode, setTestMode] = useState<"DataChannel" | "VideoStream">(
        "DataChannel",
    );
    const [dataChannelStatus, setDataChannelStatus] = useState<
        "new" | "opened" | "inprogress" | "closed"
    >("new");
    const [haltReporting, setHaltReporting] = useState<boolean>(false);
    const tearDown = () => {
        pcRef.current?.close();
        dcRef.current?.close();
        vuRef.current?.getTracks().forEach((track) => track.stop());
        setConnectionState("new");

        pcRef.current = null;
        dcRef.current = null;
    };

    useEffect(() => {
        if (haltReporting) {
            // Wait two seconds to wait for packets that are in transit
            let timeoutId: NodeJS.Timeout | null = null;
            timeoutId = setTimeout(() => {
                setDataChannelStatus("closed");
                if (siRef.current) clearInterval(siRef.current);
                if (timeoutId) clearTimeout(timeoutId);
            }, 2000);
        }
    }, [haltReporting]);

    useEffect(() => {
        // TestMode Changed We need renegotiate with server
        tearDown();
    }, [testMode]);

    const streamVideo = useCallback(async () => {
        vuRef.current = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: true,
        });
        if (vuRef.current) {
            vuRef.current
                .getTracks()
                .forEach((track) =>
                    pcRef.current?.addTrack(
                        track,
                        vuRef.current as MediaStream,
                    ),
                );
            packetLossReport();
        }
    }, []);

    const getConfiguration = useMemo(() => {
        const cnf: number[] = [frequency, packetSize, duration];
        return cnf.map((data) => data.toString());
    }, [frequency, packetSize, duration]);

    const attachListeners = useCallback(() => {
        if (!pcRef.current) return;

        pcRef.current.onicecandidate = async (event) => {
            if (event.candidate) {
                icRef.current?.push(event.candidate);
            } else {
                console.log("Browser PC finished gathering ICE candidates.");
                wsRef.current?.send(
                    JSON.stringify({
                        type: "iceCandidate",
                        candidate: icRef.current,
                    }),
                );
            }
        };

        pcRef.current.onconnectionstatechange = async () => {
            if (!pcRef.current) return;
            setConnectionState(pcRef.current.connectionState);
        };

        if (!dcRef.current) return;

        dcRef.current.onopen = () => {
            dataChannelReport();
            dcRef.current?.send(`SEND ${getConfiguration.join(" ")}`);
        };

        dcRef.current.onmessage = (messageEvent) => {
            const { data } = messageEvent;
            if (typeof data === "string") {
                if (data === "send ready") {
                    dcRef.current?.send("send start");
                    setDataChannelStatus("inprogress");
                }
                if (data.startsWith("SEND DONE")) {
                    messagesRef.current?.forEach(
                        (
                            message:
                                | { receivedAt: bigint; data: ArrayBuffer }
                                | string,
                        ) => {
                            if (message instanceof Object) {
                                const view = new DataView(message.data);
                                const sequenceNumber = view.getUint16(0, false);
                                const timestamp = view.getBigInt64(2, false);
                                setPackets((prev) => [
                                    ...prev,
                                    {
                                        sendAt: timestamp,
                                        receivedAt: message.receivedAt,
                                        sequenceNumber,
                                    },
                                ]);
                            }
                        },
                    );
                    setHaltReporting(true);
                }
            } else {
                messagesRef.current?.push({
                    receivedAt: BigInt(Date.now()),
                    data,
                });
                setSequenceReceived((prev: number[]) => [
                    ...prev,
                    new DataView(data).getUint16(0, false),
                ]);
            }
        };
    }, [getConfiguration]);

    const initiateTest = async () => {
        await initiateOffer();
    };

    const initiateOffer = useCallback(async () => {
        pcRef.current = new RTCPeerConnection();
        if (testMode === "DataChannel") {
            dcRef.current = pcRef.current.createDataChannel(
                "data-stream-channel",
                {
                    ordered: false, // Unordered
                    maxRetransmits: 0, // Unreliable (0 retransmits),
                },
            );
        } else if (testMode === "VideoStream") {
            await streamVideo();
        }
        attachListeners();
        console.debug("Offer initiated to peer");
        const offer = await pcRef.current.createOffer();
        await pcRef.current.setLocalDescription(offer);
        wsRef.current?.send(
            JSON.stringify({
                type: "offer",
                sdp: pcRef.current.localDescription,
            }),
        );
    }, [attachListeners, streamVideo, testMode]);

    const packetLossReport = async () => {
        siRef.current = setInterval(async () => {
            const report = await pcRef.current?.getStats();
            report?.forEach((r) => {
                if (r.type === "remote-inbound-rtp" && r.kind === "video") {
                    setMediaStreamStats((prev) => [
                        ...prev,
                        {
                            time: new Date().toLocaleTimeString("en-US", {
                                hour: "2-digit",
                                minute: "2-digit",
                                second: "2-digit",
                            }),
                            loss: r.packetsLost,
                        },
                    ]);
                }
            });
        }, 1000);
    };

    const dataChannelReport = async () => {
        siRef.current = setInterval(async () => {
            const report = await pcRef.current?.getStats();
            report?.forEach((r) => {
                if (r.type === "data-channel") {
                    setDataChannelStats((prev) => [
                        ...prev,
                        {
                            time: new Date().toLocaleTimeString("en-US", {
                                hour: "2-digit",
                                minute: "2-digit",
                                second: "2-digit",
                            }),
                            bytesReceived: r.bytesReceived,
                            packetsReceived: r.messagesReceived,
                        },
                    ]);
                }
            });
        }, 1000);
    };

    useEffect(() => {
        if (wsRef.current) return;
        wsRef.current = new WebSocket(signalingServerUrl ?? "");
        wsRef.current.onopen = async () => {};

        wsRef.current.onerror = () => {
            tearDown();
        };

        wsRef.current.onclose = () => {
            tearDown();
        };

        wsRef.current.onmessage = async (message) => {
            const { data } = message;
            const parsed: Message = JSON.parse(data);
            console.log(parsed);
            switch (parsed.type) {
                case "peerId":
                    setPeerId(parsed.peerId);
                    console.log("Received peer ID from server:", parsed.peerId);
                    break;
                case "answer":
                    console.log("Received SDP Answer from server.");
                    await pcRef.current?.setRemoteDescription(parsed);
                    console.log("Browser PC remote SDP answer set.");
                    break;
                case "iceCandidate":
                    console.log(
                        "Received ICE candidate from server.",
                        parsed.candidate,
                    );
                    try {
                        if (parsed.candidate && parsed.candidate.length > 0) {
                            for (const candidate of parsed.candidate) {
                                await pcRef.current?.addIceCandidate(candidate);
                            }
                        }
                    } catch (e) {
                        console.warn("Error adding remote ICE candidate:", e);
                    }
                    break;
                default:
                    console.warn(
                        "Unknown signaling message type:",
                        parsed.type,
                    );
            }
        };
    }, [attachListeners, peerId, initiateOffer, signalingServerUrl, testMode]);

    return {
        connectionState,
        initiateTest,
        peerId,
        packetLost: mediaStreamStats,
        testMode,
        setTestMode,
        dcStats: dataChannelStats,
        sequenceReceived,
        packets,
        dataChannelStatus,
    };
}
