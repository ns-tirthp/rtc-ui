import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DataChannelMessage, Maybe, Message } from "./types";
import { useGlobalStore } from "@/context/GlobalStore";

type TestMode = "DataChannel" | "VideoStream";
type TestProgressState = "new" | "opened" | "inprogress" | "closed";
type PeerConnectionState = RTCPeerConnectionState;
type DataChannelBufferMessage = {
    sendAt: bigint;
    receivedAt: bigint;
    sequenceNumber: number;
};

export default function useRTC() {
    const signalingServerUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
    const { frequency, packetSize, duration } = useGlobalStore();

    const pcRef = useRef<Maybe<RTCPeerConnection>>(null); // Peer Connection Ref
    const dcRef = useRef<Maybe<RTCDataChannel>>(null); // Data Channel Ref
    const wsRef = useRef<Maybe<WebSocket>>(null); // WebSocket Connection Ref
    const icRef = useRef<Maybe<RTCIceCandidate[]>>([]); // LocalIce candidates Ref
    const vuRef = useRef<Maybe<MediaStream>>(null); // MediaStream Ref
    const siRef = useRef<Maybe<NodeJS.Timeout>>(null); // Interval Ref
    const cvRef = useRef<Maybe<HTMLCanvasElement>>(null); // Canvas Ref
    const ctRef = useRef<Maybe<CanvasRenderingContext2D>>(null); // Context Ref

    /**
     * Cleans up all active WebRTC connections and resets state.
     */
    const tearDown = () => {
        pcRef.current?.close();
        dcRef.current?.close();
        vuRef.current?.getTracks().forEach((track) => track.stop());
        setPeerState("new");

        pcRef.current = null;
        dcRef.current = null;
    };

    const [statistics, setStatistics] = useState<Maybe<RTCStatsReport>>(null);
    /**
     * Periodically dumps RTC statistics.
     */
    const dumpStats = async () => {
        siRef.current = setInterval(async () => {
            const report = await pcRef.current?.getStats();
            if (report) setStatistics(report);
        }, 1000);
    };

    const [stopDumpingStats, setStopDumpingStats] = useState<boolean>(false);
    /**
     * Effect to handle stopping stats dumping and data channel status change.
     */
    useEffect(() => {
        if (stopDumpingStats) {
            // Wait two seconds to wait for packets that are in transit
            let timeoutId: NodeJS.Timeout | null = null;
            timeoutId = setTimeout(() => {
                setTestState("closed");
                if (siRef.current) clearInterval(siRef.current);
                if (timeoutId) clearTimeout(timeoutId);
            }, 2000);
        }
    }, [stopDumpingStats]);

    /**
     * Generates a random video frame on the canvas.
     */
    const generateRandomVideoFrame = useCallback(() => {
        if (!ctRef.current) {
            console.error("Error while generating random frame");
            return;
        }
        const imageData = ctRef.current.createImageData(640, 480);
        for (let i = 0; i < imageData.data.length; i += 4) {
            imageData.data[i + 0] = Math.random() * 255; // R
            imageData.data[i + 1] = Math.random() * 255; // G
            imageData.data[i + 2] = Math.random() * 255; // B
            imageData.data[i + 3] = 255; // A
        }
        ctRef.current.putImageData(imageData, 0, 0);
        requestAnimationFrame(generateRandomVideoFrame);
    }, []);

    /**
     * Streams dummy video from a canvas.
     * @param {number} streamDuration - Duration to stream video in milliseconds.
     */
    const streamDummyVideo = useCallback(
        (streamDuration: number) => {
            const container = document.getElementById("#videoSource");
            if (!container) {
                console.error("Video source container not found.");
                return;
            }

            const canvas = document.createElement("canvas");
            cvRef.current = canvas;
            container.appendChild(canvas);
            ctRef.current = canvas.getContext("2d");

            generateRandomVideoFrame(); // Start generating frames

            const stream = canvas.captureStream(30); // 30 FPS
            vuRef.current = stream; // Store for cleanup

            stream
                .getTracks()
                .forEach((track) => pcRef.current?.addTrack(track, stream));

            dumpStats();

            // Stop streaming after duration
            setTimeout(() => {
                tearDown();
            }, streamDuration);
        },
        [generateRandomVideoFrame],
    );

    const [testMode, setTestMode] = useState<TestMode>("DataChannel");
    useEffect(() => {
        // TestMode Changed We need renegotiate with server
        tearDown();
    }, [testMode]);

    const getConfiguration = useMemo(() => {
        const cnf: number[] = [frequency, packetSize, duration];
        return cnf.map((data) => data.toString());
    }, [frequency, packetSize, duration]);

    const [peerState, setPeerState] = useState<PeerConnectionState>("new");
    const [testState, setTestState] = useState<TestProgressState>("new");
    const [packets, setPackets] = useState<DataChannelBufferMessage[]>([]);
    /**
     * Attaches event listeners to RTCPeerConnection and RTCDataChannel.
     */
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
            setPeerState(pcRef.current.connectionState);
        };

        if (!dcRef.current) return;

        dcRef.current.onopen = () => {
            wsRef.current?.send(
                DataChannelMessage.init(getConfiguration.join(" ")),
            );
        };

        dcRef.current.onmessage = (messageEvent) => {
            const { data } = messageEvent;
            if (data instanceof ArrayBuffer) {
                const bv = new DataView(data);
                const sn = bv.getUint16(0, false);
                const ts = bv.getBigInt64(2, false);
                setPackets((prev) => [
                    ...prev,
                    {
                        sendAt: ts,
                        receivedAt: BigInt(Date.now()),
                        sequenceNumber: sn,
                    },
                ]);
            }
        };
    }, [getConfiguration]);

    const initiateTest = async () => {
        await initiateOffer();
        setTestState("inprogress");
    };

    /**
     * Selects and configures the preferred channel (DataChannel or VideoStream).
     */
    const selectChannel = useCallback(() => {
        if (!pcRef.current) return;
        if (testMode === "DataChannel") {
            dcRef.current = pcRef.current.createDataChannel(
                "data-stream-channel",
                {
                    ordered: false, // Unordered
                    maxRetransmits: 0, // Unreliable (0 retransmits),
                },
            );
        } else if (testMode === "VideoStream") {
            streamDummyVideo(30000);
        }
    }, [streamDummyVideo, testMode]);

    /**
     * Initiates the WebRTC offer process.
     */
    const initiateOffer = useCallback(async () => {
        pcRef.current = new RTCPeerConnection();
        selectChannel();
        attachListeners();
        dumpStats();
        console.debug("Offer initiated to peer");
        const offer = await pcRef.current.createOffer();
        await pcRef.current.setLocalDescription(offer);
        wsRef.current?.send(
            JSON.stringify({
                type: "offer",
                sdp: pcRef.current.localDescription,
            }),
        );
    }, [attachListeners, selectChannel]);

    /**
     * Function to handle initial handshake
     */
    const handleDataChannelHandshake = useCallback((parsed: Message) => {
        if (parsed.type !== "dataChannel") return;
        const msg = parsed.data;
        if (msg === "SEND READY") {
            wsRef.current?.send(DataChannelMessage.ready());
        } else if (msg.startsWith("SEND DONE")) {
            setStopDumpingStats(true);
            setTestState("closed");
            dcRef.current?.close();
        }
    }, []);

    /**
     * Function to handle server side error
     */
    const handleServerSideError = useCallback((parsed: Message) => {
        if (parsed.type !== "error") return;
        console.error("Received error from server - ", parsed.data);
        tearDown();
    }, []);

    const [peerId, setPeerId] = useState<Maybe<string>>(null);
    /**
     * Main effect for WebSocket connection and handling signaling messages.
     */
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
            switch (parsed.type) {
                case "dataChannel":
                    handleDataChannelHandshake(parsed);
                    break;
                case "error":
                    handleServerSideError(parsed);
                    break;
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
    }, [
        attachListeners,
        peerId,
        initiateOffer,
        signalingServerUrl,
        testMode,
        handleDataChannelHandshake,
        handleServerSideError,
    ]);

    return {
        connectionState: peerState,
        initiateTest,
        peerId,
        statistics,
        testMode,
        setTestMode,
        packets,
        dataChannelState: testState,
    };
}
