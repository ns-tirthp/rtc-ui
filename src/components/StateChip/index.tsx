// Function to determine the Tailwind CSS color class based on the RTC connection state.
const getColorClass = (state: RTCPeerConnectionState) => {
    switch (state) {
        case "new":
            // A subtle gray for a new, untouched connection.
            return "bg-gray-400";
        case "connecting":
            // A warm amber for a connection in progress.
            return "bg-yellow-500";
        case "connected":
            // A vibrant green for a successful, active connection.
            return "bg-green-500";
        case "disconnected":
            // A soft orange for a temporarily disconnected state.
            return "bg-orange-500";
        case "failed":
            // A strong red for a failed connection attempt.
            return "bg-red-600";
        case "closed":
            // A darker gray for a closed connection.
            return "bg-gray-600";
        default:
            // Default to a light gray for unknown or initial states.
            return "bg-gray-300";
    }
};

/**
 * Renders a color indicator based on the RTCPeerConnectionState.
 *
 * @param {Object} props - The component properties.
 * @param {'new' | 'connecting' | 'connected' | 'disconnected' | 'failed' | 'closed'} props.state - The RTCPeerConnection state.
 * @returns {JSX.Element} A span element with the appropriate background color.
 */
const RTCConnectionStateIndicator = ({
    state,
}: {
    state: RTCPeerConnectionState;
}) => {
    const colorClass = getColorClass(state);

    return (
        <span
            className={`inline-block w-4 h-4 rounded-full ${colorClass} shadow-md`}
            title={`Connection State: ${state}`}
            aria-label={`Connection state is ${state}`}
        ></span>
    );
};
export const StateChip = ({ state }: { state: RTCPeerConnectionState }) => {
    return (
        <div className="flex gap-2">
            <div
                className={`flex items-center space-x-3 p-3 bg-gray-50 shadow-sm w-fit rounded-4xl`}
            >
                <RTCConnectionStateIndicator
                    state={state}
                ></RTCConnectionStateIndicator>
                <p className="text-lg text-gray-700 capitalize">{state}</p>
            </div>
        </div>
    );
};
