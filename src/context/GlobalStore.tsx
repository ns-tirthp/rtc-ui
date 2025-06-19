"use client";
import React, {
    createContext,
    useContext,
    useState,
    ReactNode,
    useMemo,
} from "react";

// 1. Define the types for the global store state and the context value
export type ItemsKey =
    | "packetSize"
    | "frequency"
    | "duration"
    | "acceptableDelay";

/**
 * @typedef {Object} GlobalStoreContextType
 * Defines the shape of the object provided by the GlobalStoreContext.
 * It includes the store state and functions to manipulate it.
 * @property {GlobalStoreState} store - The current state of the global store.
 * @property {(key: string, value: any) => void} setItem - Function to update a specific key in the store.
 * @property {(updates: GlobalStoreState) => void} updateStore - Function to merge an object of updates into the store.
 * @property {(key: string) => any} getItem - Function to get the value of a specific key from the store.
 */
interface GlobalStoreContextType {
    setItem: (key: ItemsKey, value: number) => void;
    packetSize: number;
    duration: number;
    frequency: number;
    acceptableDelay: number;
}

// 2. Create the Context
// Initialize with null and assert its type, as it will be set by the Provider.
const GlobalStoreContext = createContext<GlobalStoreContextType | null>(null);

/**
 * 3. Create the Provider Component
 * This component wraps the part of your application that needs access to the global store.
 * It manages a single state object (key-value pairs) and provides functions to update it.
 * @param {Object} props - The component props.
 * @param {ReactNode} props.children - The child components to be rendered within the provider.
 * @param {GlobalStoreState} [props.initialState={}] - Optional initial state for the store.
 */
export const GlobalStoreProvider = ({ children }: { children: ReactNode }) => {
    // The main state will be a single object storing all key-value pairs
    const keys: ItemsKey[] = [
        "packetSize",
        "frequency",
        "duration",
        "acceptableDelay",
    ];
    const [packetSize, setPacketSize] = useState<number>(512);
    const [frequency, setFrequency] = useState<number>(10);
    const [duration, setDuration] = useState<number>(30);
    const [acceptableDelay, setAcceptableDelay] = useState<number>(100);

    const setter: {
        [keys: string]: (arg0: number) => void;
    } = {
        [keys[0]]: setPacketSize,
        [keys[1]]: setFrequency,
        [keys[2]]: setDuration,
        [keys[3]]: setAcceptableDelay,
    };

    /**
     * Function to update a specific key in the store.
     * It merges the new value for the given key into the existing state.
     * @param {string} key The key to update.
     * @param {*} value The new value for the key.
     */
    function setItem(key: ItemsKey, value: number): void {
        console.log(key, value);
        setter[key](value);
    }

    // The value provided to consumers will include the current store state
    // and the functions to modify it.
    const contextValue: GlobalStoreContextType = useMemo(() => {
        return {
            packetSize,
            duration,
            frequency,
            acceptableDelay,
            setItem, // Function to set a specific key-value pair
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [packetSize, duration, frequency, acceptableDelay]);

    return (
        <GlobalStoreContext.Provider value={contextValue}>
            {children}
        </GlobalStoreContext.Provider>
    );
};

/**
 * 4. Create a Custom Hook
 * This hook provides convenient access to the global store and its update functions.
 * It should only be used within components wrapped by GlobalStoreProvider.
 * @returns {GlobalStoreContextType} The global store context value.
 * @throws {Error} If the hook is used outside of a GlobalStoreProvider.
 */
export const useGlobalStore = (): GlobalStoreContextType => {
    const context = useContext(GlobalStoreContext);
    if (context === null) {
        throw new Error(
            "useGlobalStore must be used within a GlobalStoreProvider",
        );
    }
    return context;
};
