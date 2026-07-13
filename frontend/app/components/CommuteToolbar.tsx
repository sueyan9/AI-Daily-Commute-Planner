"use client";

import { useEffect, useRef, useState } from "react";
import { useSavedLocations } from "../hooks/useSavedLocations";

type Props = {
    destination: string;
    arrivalTime: string;
    preference: string;
    isNight: boolean;
    onDestinationChange: (value: string) => void;
    onArrivalTimeChange: (value: string) => void;
    onPreferenceChange: (value: string) => void;
    onPlan: () => void;
    isLoading: boolean;
};

type MenuKey = "location" | "time" | "preference" | null;

const PREFERENCE_OPTIONS = ["Fastest route", "Fewer transfers", "Less walking"];
const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
const MINUTES = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, "0"));

const DROPDOWN_PANEL =
    "absolute left-0 top-full z-20 mt-2 rounded-2xl border border-white/40 bg-white/90 p-2 shadow-xl backdrop-blur-sm";

export default function CommuteToolbar({
    destination,
    arrivalTime,
    preference,
    isNight,
    onDestinationChange,
    onArrivalTimeChange,
    onPreferenceChange,
    onPlan,
    isLoading,
}: Props) {
    const { locations, addLocation, removeLocation } = useSavedLocations();
    const [activeMenu, setActiveMenu] = useState<MenuKey>(null);
    const [isAddingLocation, setIsAddingLocation] = useState(false);
    const [newLabel, setNewLabel] = useState("");
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setActiveMenu(null);
            }
        }

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const toggleMenu = (menu: MenuKey) => {
        setActiveMenu((current) => (current === menu ? null : menu));
    };

    const activeLocation = locations.find((location) => location.address === destination);
    const locationLabel = activeLocation?.label ?? (destination || "Destination");
    const [hourPart, minutePart] = (arrivalTime || "09:00").split(":");
    const shellTextClass = isNight ? "text-white" : "text-[#1c1c2e]";
    const shellMutedTextClass = isNight ? "text-white/65" : "text-[#1c1c2e]/60";
    const shellBackgroundClass = isNight
        ? "border-white/18 bg-slate-950/24 hover:bg-white/14"
        : "border-white/50 bg-white/20 hover:bg-white/35";
    const desktopShellClass = isNight
        ? "md:rounded-full md:border md:border-white/18 md:bg-slate-950/24 md:px-2 md:py-1.5 md:shadow-lg md:backdrop-blur-sm"
        : "md:rounded-full md:border md:border-white/50 md:bg-white/20 md:px-2 md:py-1.5 md:shadow-lg md:backdrop-blur-sm";

    const handleSelectLocation = (address: string) => {
        onDestinationChange(address);
        setActiveMenu(null);
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
        <div ref={containerRef} className="relative z-30 w-full max-w-2xl space-y-3">
            <div
                className={`flex items-center gap-3 rounded-full border px-5 py-3 shadow-lg backdrop-blur-sm ${
                    isNight ? "border-white/18 bg-slate-950/24" : "border-white/50 bg-white/20"
                }`}
            >
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
                    className={`h-8 flex-1 bg-transparent text-[15px] font-medium outline-none ${
                        isNight ? "text-white placeholder:text-white/50" : "text-[#1c1c2e] placeholder:text-[#1c1c2e]/50"
                    }`}
                />
                <button
                    type="button"
                    onClick={onPlan}
                    aria-label="Search"
                    className={`transition ${isNight ? "text-white/70 hover:text-white" : "text-[#1c1c2e]/60 hover:text-[#1c1c2e]"}`}
                >
                    <SearchIcon />
                </button>
            </div>

            <div className={`flex flex-col gap-2 md:flex-row md:flex-wrap md:items-center md:gap-1 ${desktopShellClass}`}>
                <div className="relative">
                    <button
                        type="button"
                        onClick={() => toggleMenu("location")}
                        className={`flex w-full items-center justify-between gap-1.5 rounded-2xl border px-4 py-3 text-sm font-medium shadow-lg backdrop-blur-sm transition md:w-auto md:justify-start md:border-0 md:bg-transparent md:px-3 md:py-1.5 md:shadow-none md:backdrop-blur-none ${shellTextClass} ${shellBackgroundClass}`}
                    >
                        <span className="flex items-center gap-1.5">
                            <HomeIcon />
                            <span className="max-w-[160px] truncate md:max-w-[120px]">{locationLabel}</span>
                        </span>
                        <span className={`text-xs ${shellMutedTextClass}`}>▾</span>
                    </button>

                    {activeMenu === "location" && (
                        <div className={`${DROPDOWN_PANEL} w-64`}>
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

                <div className={`hidden h-5 w-px md:block ${isNight ? "bg-white/12" : "bg-black/10"}`} />

                <div className="relative">
                    <button
                        type="button"
                        onClick={() => toggleMenu("time")}
                        className={`flex w-full items-center justify-between gap-1.5 rounded-2xl border px-4 py-3 text-sm font-medium shadow-lg backdrop-blur-sm transition md:w-auto md:justify-start md:border-0 md:bg-transparent md:px-3 md:py-1.5 md:shadow-none md:backdrop-blur-none ${shellTextClass} ${shellBackgroundClass}`}
                    >
                        <span className="flex items-center gap-1.5">
                            <ClockIcon />
                            <span>Arrive by {hourPart}:{minutePart}</span>
                        </span>
                        <span className={`text-xs ${shellMutedTextClass}`}>▾</span>
                    </button>

                    {activeMenu === "time" && (
                        <div className={`${DROPDOWN_PANEL} flex w-40 gap-2`}>
                            <div className="max-h-52 flex-1 overflow-y-auto">
                                {HOURS.map((hour) => (
                                    <button
                                        key={hour}
                                        type="button"
                                        onClick={() => onArrivalTimeChange(`${hour}:${minutePart}`)}
                                        className={`w-full rounded-lg px-3 py-1.5 text-left text-sm ${
                                            hour === hourPart
                                                ? "bg-[var(--accent-soft)] font-medium text-[var(--accent)]"
                                                : "text-[#1c1c2e] hover:bg-black/5"
                                        }`}
                                    >
                                        {hour}
                                    </button>
                                ))}
                            </div>
                            <div className="max-h-52 flex-1 overflow-y-auto">
                                {MINUTES.map((minute) => (
                                    <button
                                        key={minute}
                                        type="button"
                                        onClick={() => {
                                            onArrivalTimeChange(`${hourPart}:${minute}`);
                                            setActiveMenu(null);
                                        }}
                                        className={`w-full rounded-lg px-3 py-1.5 text-left text-sm ${
                                            minute === minutePart
                                                ? "bg-[var(--accent-soft)] font-medium text-[var(--accent)]"
                                                : "text-[#1c1c2e] hover:bg-black/5"
                                        }`}
                                    >
                                        {minute}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className={`hidden h-5 w-px md:block ${isNight ? "bg-white/12" : "bg-black/10"}`} />

                <div className="relative">
                    <button
                        type="button"
                        onClick={() => toggleMenu("preference")}
                        className={`flex w-full items-center justify-between gap-1.5 rounded-2xl border px-4 py-3 text-sm font-medium shadow-lg backdrop-blur-sm transition md:w-auto md:justify-start md:border-0 md:bg-transparent md:px-3 md:py-1.5 md:shadow-none md:backdrop-blur-none ${shellTextClass} ${shellBackgroundClass}`}
                    >
                        <span>{preference}</span>
                        <span className={`text-xs ${shellMutedTextClass}`}>▾</span>
                    </button>

                    {activeMenu === "preference" && (
                        <div className={`${DROPDOWN_PANEL} w-48`}>
                            {PREFERENCE_OPTIONS.map((option) => (
                                <button
                                    key={option}
                                    type="button"
                                    onClick={() => {
                                        onPreferenceChange(option);
                                        setActiveMenu(null);
                                    }}
                                    className={`w-full rounded-xl px-3 py-2 text-left text-sm ${
                                        option === preference
                                            ? "bg-[var(--accent-soft)] font-medium text-[var(--accent)]"
                                            : "text-[#1c1c2e] hover:bg-black/5"
                                    }`}
                                >
                                    {option}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

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
