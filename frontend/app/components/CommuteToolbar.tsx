"use client";

import { useState } from "react";
import { useSavedLocations } from "../hooks/useSavedLocations";

type Props = {
    destination: string;
    arrivalTime: string;
    preference: string;
    onDestinationChange: (value: string) => void;
    onArrivalTimeChange: (value: string) => void;
    onPreferenceChange: (value: string) => void;
    onPlan: () => void;
    isLoading: boolean;
};

export default function CommuteToolbar({
    destination,
    arrivalTime,
    preference,
    onDestinationChange,
    onArrivalTimeChange,
    onPreferenceChange,
    onPlan,
    isLoading,
}: Props) {
    const { locations, addLocation, removeLocation } = useSavedLocations();
    const [isLocationMenuOpen, setIsLocationMenuOpen] = useState(false);
    const [isAddingLocation, setIsAddingLocation] = useState(false);
    const [newLabel, setNewLabel] = useState("");

    const activeLocation = locations.find((location) => location.address === destination);
    const locationLabel = activeLocation?.label ?? (destination || "Destination");

    const handleSelectLocation = (address: string) => {
        onDestinationChange(address);
        setIsLocationMenuOpen(false);
    };

    const handleSaveLocation = () => {
        const label = newLabel.trim();
        if (!label || !destination.trim()) {
            return;
        }

        addLocation(label, destination.trim());
        setNewLabel("");
        setIsAddingLocation(false);
    };

    return (
        <div className="w-full max-w-4xl space-y-3">
            <div className="flex items-center gap-3 rounded-full border border-white/40 bg-white/40 px-5 py-3 shadow-lg backdrop-blur-xl">
                <input
                    type="text"
                    value={destination}
                    onChange={(event) => onDestinationChange(event.target.value)}
                    onKeyDown={(event) => {
                        if (event.key === "Enter") {
                            onPlan();
                        }
                    }}
                    placeholder="Where do you need to be?"
                    className="h-8 flex-1 bg-transparent text-[15px] font-medium text-[#1c1c2e] outline-none placeholder:text-[#1c1c2e]/50"
                />
                <button
                    type="button"
                    onClick={onPlan}
                    aria-label="Search"
                    className="text-[#1c1c2e]/60 transition hover:text-[#1c1c2e]"
                >
                    <SearchIcon />
                </button>
            </div>

            <div className="flex flex-col gap-2 md:flex-row md:flex-wrap md:items-center md:gap-1 md:rounded-full md:border md:border-white/40 md:bg-white/40 md:px-2 md:py-1.5 md:shadow-lg md:backdrop-blur-xl">
                <div className="relative">
                    <button
                        type="button"
                        onClick={() => setIsLocationMenuOpen((value) => !value)}
                        className="flex w-full items-center justify-between gap-1.5 rounded-2xl border border-white/40 bg-white/40 px-4 py-3 text-sm font-medium text-[#1c1c2e] shadow-lg backdrop-blur-xl transition hover:bg-white/60 md:w-auto md:justify-start md:rounded-full md:border-0 md:bg-transparent md:px-3 md:py-1.5 md:shadow-none md:backdrop-blur-none"
                    >
                        <span className="flex items-center gap-1.5">
                            <HomeIcon />
                            <span className="max-w-[160px] truncate md:max-w-[120px]">{locationLabel}</span>
                        </span>
                        <span className="text-xs text-[#1c1c2e]/60">▾</span>
                    </button>

                    {isLocationMenuOpen && (
                        <div className="absolute left-0 top-full z-20 mt-2 w-64 rounded-2xl border border-white/40 bg-white/90 p-2 shadow-xl backdrop-blur-xl">
                            {locations.map((location) => (
                                <div
                                    key={location.id}
                                    className="group flex items-center justify-between rounded-xl px-3 py-2 text-sm hover:bg-black/5"
                                >
                                    <button
                                        type="button"
                                        onClick={() => handleSelectLocation(location.address)}
                                        className="flex-1 text-left font-medium text-[#1c1c2e]"
                                    >
                                        {location.label}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => removeLocation(location.id)}
                                        aria-label={`Remove ${location.label}`}
                                        className="text-[#1c1c2e]/40 opacity-0 transition group-hover:opacity-100"
                                    >
                                        ×
                                    </button>
                                </div>
                            ))}

                            {isAddingLocation ? (
                                <div className="mt-1 flex items-center gap-2 px-1 py-1">
                                    <input
                                        type="text"
                                        value={newLabel}
                                        onChange={(event) => setNewLabel(event.target.value)}
                                        placeholder="Label (e.g. Home)"
                                        className="h-9 flex-1 rounded-lg border border-black/10 bg-white px-2 text-sm text-[#1c1c2e] outline-none"
                                    />
                                    <button
                                        type="button"
                                        onClick={handleSaveLocation}
                                        className="h-9 rounded-lg bg-[#1c1c2e] px-3 text-sm font-medium text-white"
                                    >
                                        Save
                                    </button>
                                </div>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => setIsAddingLocation(true)}
                                    className="mt-1 w-full rounded-xl px-3 py-2 text-left text-sm font-medium text-[var(--accent)] hover:bg-black/5"
                                >
                                    + Save current destination
                                </button>
                            )}
                        </div>
                    )}
                </div>

                <div className="hidden h-5 w-px bg-black/10 md:block" />

                <div className="flex items-center gap-1.5 rounded-2xl border border-white/40 bg-white/40 px-4 py-3 shadow-lg backdrop-blur-xl md:rounded-full md:border-0 md:bg-transparent md:px-3 md:py-1.5 md:shadow-none md:backdrop-blur-none">
                    <ClockIcon />
                    <span className="text-sm font-medium text-[#1c1c2e]">Arrive by</span>
                    <input
                        type="time"
                        value={arrivalTime}
                        onChange={(event) => onArrivalTimeChange(event.target.value)}
                        className="ml-auto rounded-md bg-transparent text-sm font-medium text-[#1c1c2e] outline-none md:ml-0"
                    />
                </div>

                <div className="hidden h-5 w-px bg-black/10 md:block" />

                <select
                    value={preference}
                    onChange={(event) => onPreferenceChange(event.target.value)}
                    className="w-full rounded-2xl border border-white/40 bg-white/40 px-4 py-3 text-sm font-medium text-[#1c1c2e] shadow-lg outline-none backdrop-blur-xl md:w-auto md:rounded-full md:border-0 md:bg-transparent md:px-3 md:py-1.5 md:shadow-none md:backdrop-blur-none"
                >
                    <option>Fastest route</option>
                    <option>Fewer transfers</option>
                    <option>Less walking</option>
                </select>

                <button
                    onClick={onPlan}
                    disabled={isLoading}
                    className="w-full rounded-2xl bg-[var(--accent)] px-5 py-3 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 md:ml-auto md:w-auto md:rounded-full md:py-2"
                >
                    {isLoading ? "Planning..." : "Plan"}
                </button>
            </div>
        </div>
    );
}

function SearchIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4.3-4.3" />
        </svg>
    );
}

function HomeIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
            <path d="M4 11l8-7 8 7" />
            <path d="M6 10v9h12v-9" />
        </svg>
    );
}

function ClockIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
            <circle cx="12" cy="12" r="8" />
            <path d="M12 8v4l2.5 1.5" />
        </svg>
    );
}
