const wrtc = require("wrtc");
const express = require("express");
const http = require("http");
const WebSocket = require("ws"); // For WebSocket signaling
const path = require("path");
const { spawn } = require("child_process");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server: server }); // Attach WebSocket server to HTTP server
const PORT = 8080;

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, "public")));
app.use(express.json()); // To parse JSON bodies (though not used for signaling anymore)

// --- Peer Connection Management ---
// Store RTCPeerConnection, DataChannel, and other peer-specific data
// Keyed by a unique peer ID (which will be the WebSocket client's ID)
const peerConnections = new Map(); // Map<peerId, RTCPeerConnection>
const peerDataChannels = new Map(); // Map<peerId, RTCDataChannel>
const peerStreamIntervals = new Map(); // Map<peerId, setIntervalID>
const peerWsConnections = new Map(); // Map<peerId, WebSocket> to send messages back

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
function packDataWithSequenceNumber(sequenceNumber, totalBufferSize) {
    if (sequenceNumber < 0 || sequenceNumber > 1000) {
        throw new Error("Sequence number must be between 0 and 1000.");
    }

    // We'll use 2 bytes for sequence number (0-1000 fits in 10 bits, but 2 bytes is simpler for DataView)
    // We'll use 8 bytes for a 64-bit Unix timestamp (milliseconds since epoch)
    const SEQUENCE_NUMBER_SIZE = 2; // bytes
    const TIMESTAMP_SIZE = 8; // bytes (for BigInt64)
    const MIN_BUFFER_SIZE = SEQUENCE_NUMBER_SIZE + TIMESTAMP_SIZE;

    if (totalBufferSize < MIN_BUFFER_SIZE) {
        throw new Error(
            `Total buffer size must be at least ${MIN_BUFFER_SIZE} bytes (for sequence number and timestamp).`,
        );
    }

    const buffer = new ArrayBuffer(totalBufferSize);
    const view = new DataView(buffer);

    // 1. Write Sequence Number (2 bytes)
    // We're writing it as an unsigned 16-bit integer (0-65535).
    // The range 0-1000 fits comfortably.
    view.setUint16(0, sequenceNumber, false); // false for big-endian

    // 2. Write UTC Unix Timestamp (8 bytes - milliseconds)
    // Using BigInt for high-resolution timestamp
    const utcTimestamp = BigInt(Date.now());
    console.log(sequenceNumber, utcTimestamp);
    view.setBigInt64(SEQUENCE_NUMBER_SIZE, utcTimestamp, false); // false for big-endian

    // 3. Fill remaining buffer with dummy binary data
    const dummyDataStartByte = SEQUENCE_NUMBER_SIZE + TIMESTAMP_SIZE;
    const dummyDataLength = totalBufferSize - dummyDataStartByte;

    if (dummyDataLength > 0) {
        // You can fill this with anything. For simplicity, let's just use random bytes.
        // For more "dummy" data, you could use a repeating pattern or zeros.
        const dummyArray = new Uint8Array(
            buffer,
            dummyDataStartByte,
            dummyDataLength,
        );
        for (let i = 0; i < dummyDataLength; i++) {
            dummyArray[i] = Math.floor(Math.random() * 256); // Random byte
        }
        // Alternatively, for a more "consistent" dummy data pattern:
        // dummyArray.fill(0xAA); // Fills with 170
    }

    return new Uint8Array(buffer);
}

// --- WebSocket Signaling Logic ---
wss.on("connection", function connection(ws) {
    // Generate a unique ID for each new WebSocket connection (this browser client)
    const peerId = Math.random().toString(36).substring(2, 15);
    console.log(`New WebSocket connection established. Peer ID: ${peerId}`);
    peerWsConnections.set(peerId, ws); // Store WebSocket connection for sending messages back

    // Send the unique peerId to the client
    ws.send(JSON.stringify({ type: "peerId", peerId: peerId }));

    /**
     * Sets up a WebRTC Data Channel to send data based on received commands.
     * It listens for configuration, sends a ready signal, and then starts
     * transmitting data upon a 'send start' command.
     *
     * @param {RTCDataChannel} dataChannel The RTCDataChannel instance to use for sending and receiving commands.
     */
    function setupDataSender(dataChannel, peerConnection) {
        let sendIntervalId = null; // Stores the ID for the setInterval timer
        let sendTimeoutId = null; // Stores the ID for the setTimeout timer
        let currentConfig = null; // Stores the parsed configuration { intervalMs, packetSize, durationMs }

        // --- Helper function to stop any ongoing sending ---
        const stopSending = () => {
            if (sendIntervalId) {
                clearInterval(sendIntervalId);
                sendIntervalId = null;
                console.log("Sending interval cleared.");
            }
            if (sendTimeoutId) {
                clearTimeout(sendTimeoutId);
                sendTimeoutId = null;
                console.log("Sending timeout cleared.");
            }
            currentConfig = null; // Clear the configuration
            console.log("Data sending stopped.");
        };

        // --- Event listener for incoming messages on the data channel ---
        dataChannel.onmessage = (event) => {
            const message = event.data;
            console.log(`Received command: "${message}"`);

            // 1. Handle "SEND ${frequency} ${packetsize} ${duration}" command
            const configMatch = message.match(/^SEND (\d+) (\d+) (\d+)$/);
            if (configMatch) {
                const intervalMs = parseInt(configMatch[1], 10);
                const packetSize = parseInt(configMatch[2], 10);
                const durationMs = parseInt(configMatch[3], 10);

                // Basic validation
                if (
                    isNaN(intervalMs) ||
                    intervalMs <= 0 ||
                    isNaN(packetSize) ||
                    packetSize <= 0 ||
                    isNaN(durationMs) ||
                    durationMs <= 0
                ) {
                    console.error(
                        "Invalid SEND command parameters. Please use positive numbers for interval, packet size, and duration.",
                    );
                    return;
                }

                currentConfig = { intervalMs, packetSize, durationMs };
                console.log(
                    `Configuration received: Send every ${intervalMs}ms, packet size ${packetSize} bytes, for ${durationMs}ms.`,
                );

                // Send confirmation back
                try {
                    dataChannel.send("send ready");
                    console.log("Sent: 'send ready'");
                } catch (e) {
                    console.error("Failed to send 'send ready':", e);
                }
            }
            // 2. Handle "send start" command
            else if (message === "send start") {
                if (!currentConfig) {
                    console.warn(
                        "Received 'send start' but no configuration was set (use SEND command first).",
                    );
                    return;
                }

                // Stop any previous sending first
                // stopSending();

                console.log(
                    `Starting data transmission: ${currentConfig.packetSize} bytes every ${currentConfig.intervalMs}ms for ${currentConfig.durationMs}ms.`,
                );

                // Start sending interval
                let packetsSentCount = 0;
                sendIntervalId = setInterval(async () => {
                    if (dataChannel.readyState === "open") {
                        try {
                            if (
                                packetsSentCount >=
                                currentConfig.durationMs *
                                currentConfig.intervalMs
                            ) {
                                const report = await peerConnection.getStats();
                                report?.forEach((r) => {
                                    if (r.type === "data-channel") {
                                        console.log(
                                            `Completed sending for ${currentConfig.durationMs}ms. Total packets sent: ${r.messagesSent}. Total bytes send: ${r.bytesSent}`,
                                        );
                                        dataChannel.send(
                                            `SEND DONE ${r.messagesSent} ${r.bytesSent}`,
                                        );
                                    }
                                });
                                stopSending();
                            } else {
                                for (
                                    let i = 0;
                                    i < currentConfig.intervalMs;
                                    i++
                                ) {
                                    dataChannel.send(
                                        packDataWithSequenceNumber(
                                            packetsSentCount,
                                            currentConfig.packetSize,
                                        ),
                                    );
                                    packetsSentCount++;
                                }
                            }
                        } catch (e) {
                            console.error("Error sending data:", e);
                            // Optionally, stop sending if there's a persistent error
                            stopSending();
                        }
                    } else {
                        console.warn(
                            "Data channel not open, stopping send interval.",
                        );
                        stopSending();
                    }
                }, 1000);
            } else {
                console.log(`Unknown command received: "${message}"`);
            }
        };

        // --- Handle data channel state changes ---
        dataChannel.onopen = () => {
            console.log("Data channel state: open. Ready to receive commands.");
        };

        dataChannel.onclose = () => {
            console.log(
                "Data channel state: closed. Stopping any active sending.",
            );
            stopSending(); // Ensure timers are cleared if channel closes unexpectedly
        };

        dataChannel.onerror = (error) => {
            console.error("Data channel error:", error);
            stopSending(); // Clear timers on error
        };

        console.log("setupDataSender initialized. Waiting for commands...");
    }

    // WebSocket message listener for signaling
    ws.on("message", async (message) => {
        let localIceCandidates = [];
        const signalingMessage = JSON.parse(message);
        const pc = peerConnections.get(peerId); // Get the RTCPeerConnection for this peer

        switch (signalingMessage.type) {
            case "offer":
                console.log(`Received OFFER from peer ${peerId}`);
                // If a connection already exists for this peerId, close it first
                if (pc) {
                    pc.close();
                    peerConnections.delete(peerId);
                    if (peerStreamIntervals.has(peerId)) {
                        clearInterval(peerStreamIntervals.get(peerId));
                        peerStreamIntervals.delete(peerId);
                    }
                    peerDataChannels.delete(peerId);
                    console.log(
                        `Existing connection for ${peerId} closed before new offer.`,
                    );
                }

                // 1. Create a new RTCPeerConnection for THIS specific peer
                const newPc = new wrtc.RTCPeerConnection();
                peerConnections.set(peerId, newPc); // Store it in the map

                // 2. Set up event handlers for this specific RTCPeerConnection
                newPc.onicecandidate = (event) => {
                    if (event.candidate) {
                        localIceCandidates.push(event.candidate);
                        // Send ICE candidate back to THIS peer via its WebSocket
                        // ws.send(JSON.stringify({ type: 'iceCandidate', candidate: event.candidate }));
                    } else {
                        // All candidates gathered for THIS peer. Send the Answer back.
                        ws.send(
                            JSON.stringify({
                                type: "iceCandidate",
                                candidate: localIceCandidates,
                            }),
                        );
                    }
                };

                newPc.ontrack = (event) => {
                    const [remoteStream] = event.streams;
                    console.log(remoteStream, "got stream");
                };

                newPc.ondatachannel = (event) => {
                    const channel = event.channel;
                    setupDataSender(channel, newPc);
                    setInterval(async () => { }, 1000);
                };

                newPc.onconnectionstatechange = () => {
                    console.log(
                        `Peer ${peerId} connection state: ${newPc.connectionState}`,
                    );
                    if (
                        newPc.connectionState === "disconnected" ||
                        newPc.connectionState === "closed" ||
                        newPc.connectionState === "failed"
                    ) {
                        console.log(
                            `WebRTC connection for peer ${peerId} closed or failed. Cleaning up.`,
                        );
                        // Cleanup on connection close/fail
                        if (peerStreamIntervals.has(peerId)) {
                            clearInterval(peerStreamIntervals.get(peerId));
                            peerStreamIntervals.delete(peerId);
                        }
                        if (peerConnections.has(peerId)) {
                            peerConnections.get(peerId).close();
                            peerConnections.delete(peerId);
                        }
                        peerDataChannels.delete(peerId);
                        // No need to close WebSocket here, it will trigger 'close' event
                    }
                };

                // 5. Set remote description and create answer for THIS peer
                try {
                    await newPc.setRemoteDescription(signalingMessage.sdp);
                    const answer = await newPc.createAnswer();
                    ws.send(JSON.stringify(answer));
                    await newPc.setLocalDescription(answer);
                } catch (error) {
                    console.error(
                        `Error handling offer for peer ${peerId}:`,
                        error,
                    );
                }
                break;

            case "iceCandidate":
                console.log(
                    `Received ICE candidate from peer ${peerId}`,
                    signalingMessage.candidate,
                );
                if (pc && pc.remoteDescription) {
                    try {
                        for (const candidate of signalingMessage.candidate) {
                            await pc.addIceCandidate(candidate);
                        }
                    } catch (error) {
                        console.error(
                            `Error adding ICE candidate for peer ${peerId}:`,
                            error,
                        );
                    }
                } else {
                    // This scenario should be rare if 'offer' is processed first
                    console.warn(
                        `Remote description not set yet for peer ${peerId}, cannot add ICE candidate.`,
                    );
                }
                break;

            // Add other signaling message types if needed (e.g., 'hangup')
            default:
                console.warn(
                    `Unknown signaling message type from peer ${peerId}: ${signalingMessage.type}`,
                );
                break;
        }
    });

    // WebSocket close handler
    ws.on("close", () => {
        console.log(
            `WebSocket connection closed for peer ${peerId}. Cleaning up RTCPeerConnection.`,
        );
        const pc = peerConnections.get(peerId);
        if (pc) {
            pc.close(); // Close the associated WebRTC peer connection
            peerConnections.delete(peerId);
        }
        if (peerStreamIntervals.has(peerId)) {
            clearInterval(peerStreamIntervals.get(peerId));
            peerStreamIntervals.delete(peerId);
        }
        peerDataChannels.delete(peerId);
        peerWsConnections.delete(peerId);
    });

    ws.on("error", (error) => {
        console.error(`WebSocket error for peer ${peerId}:`, error);
    });
});

// Start the HTTP/WebSocket server
server.listen(PORT, () => {
    console.log(
        `Node.js WebRTC Signaling Server listening on http://localhost:${PORT}`,
    );
    console.log(
        `Open http://localhost:${PORT} in multiple browser tabs to connect as peers.`,
    );
});
