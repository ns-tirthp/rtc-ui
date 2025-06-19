"use client";
import React, { useState, useEffect, ChangeEvent, JSX } from "react";
import { HardDrive, RefreshCcw, Timer, AlarmClock } from "lucide-react"; // Importing icons from lucide-react
import { ItemsKey, useGlobalStore } from "@/context/GlobalStore";

// Reusable SettingControl Component
// This component handles the rendering and logic for a single setting (slider + dropdown).
// It also now accepts an Icon component as a prop.
const SettingControl = ({
    title,
    Icon,
    min,
    max,
    step,
    initialValue,
    options,
    formatValue,
    onChangeHandler,
}: {
    title: string;
    Icon: JSX.Element;
    min: number;
    max: number;
    step: number;
    initialValue: number;
    options: { value: number; label: string }[];
    formatValue: (val: number) => string;
    onChangeHandler: (
        event: ChangeEvent<HTMLInputElement | HTMLSelectElement>,
    ) => void;
}) => {
    // State to hold the current value of the setting
    const [value, setValue] = useState(initialValue);

    // Function to handle changes from the slider
    const handleSliderChange = (event: ChangeEvent<HTMLInputElement>) => {
        setValue(Number(event.target.value)); // Update state with the slider's numeric value
        onChangeHandler(event);
    };

    // Function to handle changes from the dropdown
    const handleDropdownChange = (event: ChangeEvent<HTMLSelectElement>) => {
        setValue(Number(event.target.value)); // Update state with the dropdown's numeric value
        onChangeHandler(event);
    };

    // useEffect to ensure dropdown matches slider on initial render and external state changes
    useEffect(() => {
        setValue(initialValue);
    }, [initialValue]);

    return (
        // Card layout for each setting
        <div className="bg-white p-6 rounded-xl shadow-lg flex-shrink-0 w-full sm:w-72 md:w-80 lg:w-96">
            <div className="flex items-center justify-between mb-4">
                {/* Card Title */}
                <h3 className="text-xl font-bold text-gray-800 flex items-center">
                    {Icon}
                    {/* Icon display */}
                    {title}
                </h3>
                {/* Current Value Display */}
                <span
                    id={title}
                    className="text-blue-600 text-lg font-semibold"
                >
                    {formatValue(value)}
                </span>
            </div>

            {/* Slider input */}
            <input
                type="range"
                id={title}
                min={min}
                max={max}
                value={value}
                step={step}
                onChange={handleSliderChange}
                className="w-full h-2 rounded-full appearance-none bg-gray-300 cursor-pointer mb-4"
            />
            {/* Dropdown select */}
            <select
                id={title}
                value={value}
                onChange={handleDropdownChange}
                className="block w-full px-4 py-2 text-gray-700 bg-gray-50 border border-gray-300 rounded-lg shadow-sm
                           focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-150 ease-in-out"
            >
                {options.map((option) => (
                    <option key={option.value} value={option.value}>
                        {option.label}
                    </option>
                ))}
            </select>
        </div>
    );
};

// Main App Component
const Configuration = () => {
    const { setItem } = useGlobalStore();

    // Format functions for each setting to display values with appropriate units
    const formatPacketSize = (val: number) => `${val} Bytes`;
    const formatFrequency = (val: number) => `${val} Hz`;
    const formatDuration = (val: number) => {
        const minutes = Math.floor(val / 60);
        const seconds = val - minutes * 60;
        const literalM = minutes > 0 ? `${minutes} Minutes ` : "";
        const literalS = seconds > 0 ? `${seconds} Seconds` : "";
        return literalM + literalS;
    };
    const formatDelay = (val: number) => `${val} ms`;

    const handler = (
        event: ChangeEvent<HTMLInputElement | HTMLSelectElement>,
    ) => {
        setItem(event.target.id as ItemsKey, parseInt(event.target.value, 10));
    };

    // Options data for each dropdown
    const packetSizeOptions = [
        { value: 16, label: "16 Bytes" },
        { value: 128, label: "128 Bytes" },
        { value: 256, label: "256 Bytes" },
        { value: 512, label: "512 Bytes" },
        { value: 1024, label: "1024 Bytes" },
        { value: 2048, label: "2048 Bytes" },
        { value: 4096, label: "4096 Bytes" },
        { value: 8192, label: "8192 Bytes" },
        { value: 16384, label: "16384 Bytes" },
    ];

    const frequencyOptions = [
        { value: 1, label: "1 Hz" },
        { value: 5, label: "5 Hz" },
        { value: 10, label: "10 Hz" },
        { value: 20, label: "20 Hz" },
        { value: 50, label: "50 Hz" },
        { value: 100, label: "100 Hz" },
    ];

    const durationOptions = [
        { value: 5, label: "5 Seconds" },
        { value: 15, label: "15 Seconds" },
        { value: 30, label: "30 Seconds" },
        { value: 60, label: "1 Minute" },
        { value: 120, label: "2 Minutes" },
        { value: 300, label: "5 Minutes" },
    ];

    const delayOptions = [
        { value: 10, label: "10 ms" },
        { value: 50, label: "50 ms" },
        { value: 100, label: "100 ms" },
        { value: 250, label: "250 ms" },
        { value: 500, label: "500 ms" },
        { value: 1000, label: "1000 ms (1s)" },
    ];

    return (
        <div className="flex items-start p-4">
            {/* Main container for the settings panel - now a flex container for cards */}
            <div className="flex flex-wrap justify-center gap-6 p-4">
                {/* Packet Size Setting Card */}
                <SettingControl
                    title="packetSize"
                    Icon={
                        <HardDrive className="mr-2 text-blue-600" size={24} />
                    } // Icon for Packet Size
                    min={128}
                    max={2048}
                    step={128}
                    initialValue={512}
                    options={packetSizeOptions}
                    formatValue={formatPacketSize}
                    onChangeHandler={handler}
                />

                {/* Frequency Setting Card */}
                <SettingControl
                    title="frequency"
                    Icon={
                        <RefreshCcw className="mr-2 text-blue-600" size={24} />
                    } // Icon for Frequency
                    min={1}
                    max={100}
                    step={1}
                    initialValue={10}
                    options={frequencyOptions}
                    formatValue={formatFrequency}
                    onChangeHandler={handler}
                />

                {/* Duration Setting Card */}
                <SettingControl
                    title="duration"
                    Icon={<Timer className="mr-2 text-blue-600" size={24} />} // Icon for Duration
                    min={5}
                    max={300}
                    step={5}
                    initialValue={30}
                    options={durationOptions}
                    formatValue={formatDuration}
                    onChangeHandler={handler}
                />

                {/* Acceptable Delay Setting Card */}
                <SettingControl
                    title="acceptableDelay"
                    Icon={
                        <AlarmClock className="mr-2 text-blue-600" size={24} />
                    } // Icon for Acceptable Delay
                    min={10}
                    max={1000}
                    step={10}
                    initialValue={100}
                    options={delayOptions}
                    formatValue={formatDelay}
                    onChangeHandler={handler}
                />
            </div>
        </div>
    );
};

export default Configuration;
