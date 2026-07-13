"use client";

import { useState, type ReactNode } from "react";

type DecisionFactor = {
    type: string;
    importance: "low" | "medium" | "high";
    message: string;
};

type CommutePlan = {
    destination: string;
    driving_route: {
        duration: string;
        distance_meters: number;
        static_duration?: string | null;
    } | null;
    transit_route?: {
        available: boolean;
        status: string;
        route_label?: string | null;
        departure_time?: string | null;
        arrival_time?: string | null;
        travel_time_minutes?: number | null;
        transfers?: number | null;
        next_departures?: Array<{
            time: string;
            scheduled_time?: string | null;
            delay_minutes?: number | null;
            status: string;
        }>;
    } | null;
    weather: {
        temperature: number | null;
        feels_like: number | null;
        precipitation: number | null;
        rain: number | null;
        weather_code: number | null;
        wind_speed: number | null;
    } | null;
    weather_notice: string | null;
    recommendation: string | null;
    routing_basis?: "live" | "predicted";
    decision: {
        recommended_mode: "driving" | "transit";
        recommended_label: string;
        recommended_icon: string;
        leave_time: string | null;
        arrival_time: string | null;
        travel_time_minutes: number | null;
        traffic?: {
            level: string;
            importance: "low" | "medium" | "high";
            message: string;
            tag: string;
        };
        headline: string;
        reason: string;
        summary: string;
        decision_factors: DecisionFactor[];
        highlights: Array<{
            icon: string;
            label: string;
        }>;
        comparison: {
            title: string;
            recommended_mode: "driving" | "transit";
            driving: {
                label: string;
                leave_time: string | null;
                arrival_time: string | null;
                travel_time_minutes: number | null;
            };
            transit: {
                label: string;
                available: boolean;
                status: string;
                route_label?: string | null;
                departure_time?: string | null;
                arrival_time?: string | null;
                travel_time_minutes?: number | null;
                next_departures?: Array<{
                    time: string;
                    scheduled_time?: string | null;
                    delay_minutes?: number | null;
                    status: string;
                }>;
            };
        };
    } | null;
};

type Props = {
    result: CommutePlan | null;
    isLoading: boolean;
    error: string | null;
    arrivalTime: string;
    lastUpdatedAt?: Date | null;
    lastUpdatedLabel?: string | null;
    onRefresh: () => void;
    onApplyMode: (mode: "driving" | "transit") => void;
};

export default function RecommendationCard({
    result,
    isLoading,
    error,
    arrivalTime,
    lastUpdatedAt,
    lastUpdatedLabel,
    onRefresh,
    onApplyMode,
}: Props) {
    const [isWhyOpen, setIsWhyOpen] = useState(false);
    const [reminderState, setReminderState] = useState<string | null>(null);
    const decision = result?.decision;
    const factors = decision?.decision_factors ?? getFallbackFactors(result);
    const comparison = decision?.comparison;
    const leaveTime =
        decision?.leave_time ??
        getFallbackLeaveTime(arrivalTime, result?.driving_route?.duration) ??
        getCurrentTimeDisplay();
    const driveMinutes =
        comparison?.driving.travel_time_minutes ?? getDriveMinutes(result?.driving_route?.duration);
    const recommendedMode = decision?.recommended_mode ?? comparison?.recommended_mode ?? "driving";
    const transitMinutes = comparison?.transit.travel_time_minutes ?? result?.transit_route?.travel_time_minutes;
    const transitAvailable = comparison?.transit.available ?? false;
    const transitTransfers = result?.transit_route?.transfers;
    const transitTransferLabel =
        typeof transitTransfers === "number"
            ? transitTransfers === 0
                ? "No transfers needed"
                : `${transitTransfers} transfer${transitTransfers > 1 ? "s" : ""}`
            : undefined;
    const arrivalDisplay =
        decision?.arrival_time ??
        (recommendedMode === "transit"
            ? comparison?.transit.arrival_time ?? formatTime(arrivalTime)
            : comparison?.driving.arrival_time ?? formatTime(arrivalTime)) ??
        formatTime(arrivalTime) ??
        "Pending";
    const leaveDeltaLabel = getLeaveDeltaLabel(leaveTime);
    const updateState = getUpdateState(lastUpdatedAt);

    const handleReminder = async () => {
        const delayMs = getMsUntilTime(leaveTime);
        if (delayMs === null) {
            setReminderState("Reminder unavailable until leave time is confirmed.");
            return;
        }

        if (typeof window === "undefined" || !("Notification" in window)) {
            setReminderState("This browser does not support notifications.");
            return;
        }

        const permission =
            Notification.permission === "granted"
                ? "granted"
                : await Notification.requestPermission();

        if (permission !== "granted") {
            setReminderState("Enable browser notifications to get a leave reminder.");
            return;
        }

        window.setTimeout(() => {
            new Notification("LeaveWise", {
                body: `Time to leave for ${result?.destination ?? "your trip"}. Aim to arrive by ${arrivalDisplay}.`,
            });
        }, Math.max(delayMs, 0));

        setReminderState(delayMs <= 60000 ? "Reminder armed for now." : `Reminder set for ${leaveTime}.`);
    };

    return (
        <div className="flex w-full max-w-2xl flex-col gap-3">
            {/* Hero */}
            <div className="rounded-[28px] border border-white/15 bg-gradient-to-r from-white/8 to-transparent p-6 shadow-lg backdrop-blur-sm">
                <p className="ui-label text-[#1c1c2e]/60">Ai recommendation</p>

                <p className="mt-3 ui-label text-[#1c1c2e]/60">Leave at</p>
                <div className="mt-1 flex items-end gap-2 text-[3.2rem] font-semibold leading-none tracking-[-0.05em] text-[#1c1c2e]">
                    <span>{error ? "--" : isLoading ? "..." : getTimeParts(leaveTime).time}</span>
                    <span className="pb-1 text-[0.3em] tracking-[-0.03em] text-[#1c1c2e]/80">
                        {error ? "" : isLoading ? "" : getTimeParts(leaveTime).period}
                    </span>
                </div>

                <p className="mt-2 flex items-center gap-2 text-[1.05rem] font-medium text-[var(--accent)]">
                    {recommendedMode === "transit" ? <TransitIcon /> : <CarIcon />}
                    {error
                        ? "Recommendation unavailable"
                        : isLoading
                          ? "Analyzing live conditions"
                          : `${decision?.recommended_label ?? "Drive"} · ${driveMinutes ? `${driveMinutes} min` : "Timing pending"}`}
                </p>

                {!error && !isLoading && (
                    <div className="mt-4 grid grid-cols-1 gap-3 rounded-[22px] border border-white/10 bg-white/6 p-4 md:grid-cols-3">
                        <MetaStat label="Arrive by" value={arrivalDisplay} />
                        <MetaStat label="Leave in" value={leaveDeltaLabel} />
                        <MetaStat
                            label={recommendedMode === "transit" ? "Transit line" : "Travel time"}
                            value={
                                recommendedMode === "transit"
                                    ? formatTransitLabel(comparison?.transit.route_label ?? comparison?.transit.label)
                                    : driveMinutes
                                      ? `${driveMinutes} min`
                                      : "Pending"
                            }
                        />
                    </div>
                )}

                {!error && !isLoading && result?.routing_basis === "predicted" && (
                    <p className="mt-1 text-xs text-[#1c1c2e]/50">
                        Based on predicted traffic near {leaveTime}, not live conditions.
                    </p>
                )}

                <p className="mt-4 border-t border-white/10 pt-3 text-[14px] leading-6 text-[#1c1c2e]/75">
                    {error
                        ? error
                        : isLoading
                          ? "Checking traffic, timing, and weather to decide the cleanest departure window."
                          : decision?.reason ??
                            result?.recommendation ??
                            "A live recommendation will appear here after the route and weather data load."}
                </p>

                <div className="mt-3 flex flex-col gap-3 border-t border-white/30 pt-3">
                    {(error || isLoading) && (
                        <StatusBadge label={error ? "Service issue" : "Refreshing"} tone={error ? "warning" : "normal"} />
                    )}
                    {!error && !isLoading && updateState && (
                        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                            <StatusBadge label={updateState.label} tone={updateState.tone} />
                            <button
                                type="button"
                                onClick={onRefresh}
                                className="inline-flex items-center gap-2 self-start rounded-full border border-white/30 bg-white/12 px-3 py-1.5 text-xs font-medium text-[#1c1c2e] transition hover:bg-white/20"
                            >
                                <RefreshIcon />
                                Refresh now
                            </button>
                        </div>
                    )}
                    {!error && !isLoading && (
                        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                            <button
                                type="button"
                                onClick={handleReminder}
                                className="inline-flex items-center gap-2 self-start rounded-full border border-[var(--accent)]/25 bg-[var(--accent-soft)]/50 px-3 py-1.5 text-xs font-medium text-[var(--accent)] transition hover:bg-[var(--accent-soft)]/70"
                            >
                                <BellIcon />
                                Remind me to leave
                            </button>
                            {reminderState && <p className="text-xs text-[#1c1c2e]/55">{reminderState}</p>}
                        </div>
                    )}
                </div>
            </div>

            {/* Comparison */}
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <CompareCard
                    icon={<CarIcon />}
                    label={comparison?.driving.label ?? "Drive"}
                    minutes={driveMinutes}
                    arrivalTime={comparison?.driving.arrival_time ?? formatTime(arrivalTime)}
                    tag={recommendedMode === "driving" ? "Recommended" : `Leave ${comparison?.driving.leave_time ?? leaveTime}`}
                    isRecommended={recommendedMode === "driving"}
                    actionLabel={recommendedMode === "driving" ? "Current best option" : "Choose drive instead"}
                    onSelect={() => onApplyMode("driving")}
                />
                <CompareCard
                    icon={<TransitIcon />}
                    label={formatTransitLabel(comparison?.transit.route_label ?? comparison?.transit.label)}
                    minutes={transitAvailable ? transitMinutes ?? null : null}
                    arrivalTime={comparison?.transit.arrival_time ?? null}
                    tag={
                        recommendedMode === "transit"
                            ? "Recommended"
                            : transitAvailable
                              ? transitTransferLabel ?? "Available"
                              : comparison?.transit.status ?? "Not available"
                    }
                    isRecommended={recommendedMode === "transit"}
                    isUnavailable={!transitAvailable}
                    actionLabel={
                        recommendedMode === "transit"
                            ? "Current best option"
                            : transitAvailable
                              ? "Choose transit instead"
                              : "Transit unavailable"
                    }
                    onSelect={transitAvailable ? () => onApplyMode("transit") : undefined}
                />
            </div>

            {/* Why this recommendation */}
            <div className="rounded-[24px] border border-white/10 bg-gradient-to-r from-white/10 via-white/5 to-transparent p-5 shadow-none backdrop-blur-sm">
                <button
                    type="button"
                    onClick={() => setIsWhyOpen((value) => !value)}
                    className="flex w-full items-center justify-between text-left"
                >
                    <p className="ui-label text-[#1c1c2e]/60">Why this recommendation</p>
                    <span className="text-[#1c1c2e]/50">{isWhyOpen ? "▲" : "▼"}</span>
                </button>

                <div className={`mt-4 space-y-4 ${isWhyOpen ? "" : "hidden"}`}>
                    {factors.map((factor) => (
                        <ReasonRow key={`${factor.type}-${factor.message}`} factor={factor} />
                    ))}
                </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-1 text-xs text-white/80">
                <span>{lastUpdatedLabel ?? "Not planned yet"}</span>
                <span>Data from Google Maps and Open-Meteo</span>
            </div>
        </div>
    );
}

function StatusBadge({ label, tone }: { label: string; tone: "normal" | "warning" }) {
    return (
        <span
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium ${
                tone === "warning"
                    ? "border-rose-200 bg-rose-50 text-rose-700"
                    : "border-white/50 bg-white/60 text-[#1c1c2e]"
            }`}
        >
            <span className={`h-2 w-2 rounded-full ${tone === "warning" ? "bg-rose-500" : "bg-emerald-500"}`} />
            {label}
        </span>
    );
}

function MetaStat({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-[#1c1c2e]/45">{label}</p>
            <p className="mt-1 text-sm font-medium text-[#1c1c2e]">{value}</p>
        </div>
    );
}

function CompareCard({
    icon,
    label,
    minutes,
    arrivalTime,
    tag,
    isRecommended,
    isUnavailable = false,
    actionLabel,
    onSelect,
}: {
    icon: ReactNode;
    label: string;
    minutes: number | null;
    arrivalTime: string | null;
    tag: string;
    isRecommended: boolean;
    isUnavailable?: boolean;
    actionLabel: string;
    onSelect?: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onSelect}
            disabled={!onSelect}
            className={`rounded-[22px] border bg-gradient-to-r p-5 backdrop-blur-sm ${
                isRecommended
                    ? "border-[var(--accent)]/50 from-[var(--accent-soft)]/45 via-[var(--accent-soft)]/20 to-[var(--accent-soft)]/5 shadow-xl"
                    : "border-white/20 from-white/10 via-white/5 to-transparent shadow-md"
            } ${onSelect ? "cursor-pointer transition hover:-translate-y-0.5 hover:bg-white/10" : "cursor-default opacity-70"}`}
        >
            <div className="text-[#1c1c2e]/70">{icon}</div>
            <p className="mt-2 flex items-baseline gap-1.5 text-[2.5rem] font-semibold leading-none tracking-[-0.04em] text-[#1c1c2e]">
                {isUnavailable ? "--" : minutes ?? "--"}
                {!isUnavailable && minutes !== null && (
                    <span className="text-[0.4em] font-medium text-[#1c1c2e]/60">min</span>
                )}
            </p>
            <p className="mt-2 text-sm font-medium text-[#1c1c2e]">{label}</p>
            <p className={`mt-1 text-xs ${isRecommended ? "text-[var(--accent)]" : "text-[#1c1c2e]/55"}`}>{tag}</p>
            <p className="mt-3 text-xs text-[#1c1c2e]/55">{arrivalTime ? `Arrive by ${arrivalTime}` : "Arrival time pending"}</p>
            <p className="mt-3 text-sm font-medium text-[#1c1c2e]">{actionLabel}</p>
        </button>
    );
}

function ReasonRow({ factor }: { factor: DecisionFactor }) {
    const icon = getFactorIcon(factor.type);

    return (
        <div className="flex items-start gap-3">
            <span className="mt-0.5 text-[var(--accent)]">{icon}</span>
            <div>
                <p className="text-sm font-medium capitalize text-[#1c1c2e]">{factor.type}</p>
                <p className="text-xs leading-5 text-[#1c1c2e]/65">{factor.message}</p>
            </div>
        </div>
    );
}

function getFactorIcon(type: string) {
    switch (type.toLowerCase()) {
        case "traffic":
        case "route":
            return <RouteIcon />;
        case "weather":
            return <WeatherIcon />;
        default:
            return <PreferenceIcon />;
    }
}

function getDriveMinutes(duration: string | undefined): number | null {
    if (!duration || !duration.endsWith("s")) {
        return null;
    }

    const seconds = Number.parseInt(duration.slice(0, -1), 10);
    if (Number.isNaN(seconds)) {
        return null;
    }

    return Math.round(seconds / 60);
}

function getFallbackLeaveTime(arrivalTime: string, driveDuration: string | undefined): string | null {
    const driveMinutes = getDriveMinutes(driveDuration);
    if (!driveMinutes) {
        return null;
    }

    const [hours, minutes] = arrivalTime.split(":").map(Number);
    if (Number.isNaN(hours) || Number.isNaN(minutes)) {
        return null;
    }

    const totalMinutes = hours * 60 + minutes - driveMinutes;
    const normalizedMinutes = ((totalMinutes % (24 * 60)) + (24 * 60)) % (24 * 60);
    const outputHours = Math.floor(normalizedMinutes / 60);
    const outputMinutes = normalizedMinutes % 60;

    return formatTime(`${String(outputHours).padStart(2, "0")}:${String(outputMinutes).padStart(2, "0")}`);
}

function formatTime(value: string): string | null {
    if (!value) {
        return null;
    }

    const [hours, minutes] = value.split(":").map(Number);
    if (Number.isNaN(hours) || Number.isNaN(minutes)) {
        return value;
    }

    const period = hours >= 12 ? "PM" : "AM";
    const normalizedHours = hours % 12 || 12;
    return `${normalizedHours}:${String(minutes).padStart(2, "0")} ${period}`;
}

function getCurrentTimeDisplay(): string {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const period = hours >= 12 ? "PM" : "AM";
    const normalizedHours = hours % 12 || 12;

    return `${normalizedHours}:${String(minutes).padStart(2, "0")} ${period}`;
}

function getTimeParts(value: string) {
    const match = value.match(/^(.+)\s(AM|PM)$/);
    if (!match) {
        return { time: value, period: "" };
    }

    return { time: match[1], period: match[2] };
}

function formatTransitLabel(value: string | undefined): string {
    if (!value) {
        return "Public transport";
    }

    const trimmed = value.trim();
    if (/^route\s/i.test(trimmed) || /^public transport$/i.test(trimmed)) {
        return trimmed;
    }

    if (/^[A-Z0-9-]+$/.test(trimmed)) {
        return `Route ${trimmed}`;
    }

    return trimmed;
}

function getUpdateState(lastUpdatedAt: Date | null | undefined) {
    if (!lastUpdatedAt) {
        return null;
    }

    const minutesAgo = Math.floor((Date.now() - lastUpdatedAt.getTime()) / 60000);
    if (minutesAgo >= 10) {
        return {
            label: `Traffic data is ${minutesAgo} min old. Refresh before leaving.`,
            tone: "warning" as const,
        };
    }

    return {
        label: minutesAgo <= 0 ? "Traffic and weather were refreshed just now." : `Traffic and weather refreshed ${minutesAgo} min ago.`,
        tone: "normal" as const,
    };
}

function getLeaveDeltaLabel(leaveTime: string): string {
    const minutesUntilLeave = getMinutesUntilTime(leaveTime);
    if (minutesUntilLeave === null) {
        return "Pending";
    }

    if (minutesUntilLeave <= 0) {
        return "Leave now";
    }

    if (minutesUntilLeave === 1) {
        return "1 min";
    }

    if (minutesUntilLeave < 60) {
        return `${minutesUntilLeave} min`;
    }

    const hours = Math.floor(minutesUntilLeave / 60);
    const minutes = minutesUntilLeave % 60;
    return minutes === 0 ? `${hours} hr` : `${hours} hr ${minutes} min`;
}

function getMinutesUntilTime(value: string): number | null {
    const target = getDateForTime(value);
    if (!target) {
        return null;
    }

    return Math.round((target.getTime() - Date.now()) / 60000);
}

function getMsUntilTime(value: string): number | null {
    const target = getDateForTime(value);
    if (!target) {
        return null;
    }

    return target.getTime() - Date.now();
}

function getDateForTime(value: string): Date | null {
    const match = value.match(/^(\d{1,2}):(\d{2})\s(AM|PM)$/);
    if (!match) {
        return null;
    }

    let hours = Number.parseInt(match[1], 10);
    const minutes = Number.parseInt(match[2], 10);
    const period = match[3];

    if (Number.isNaN(hours) || Number.isNaN(minutes)) {
        return null;
    }

    if (period === "PM" && hours !== 12) {
        hours += 12;
    }
    if (period === "AM" && hours === 12) {
        hours = 0;
    }

    const now = new Date();
    const target = new Date(now);
    target.setHours(hours, minutes, 0, 0);
    return target;
}

function getFallbackFactors(result: CommutePlan | null): DecisionFactor[] {
    const factors: DecisionFactor[] = [];
    const driveMinutes = getDriveMinutes(result?.driving_route?.duration);

    if (driveMinutes) {
        factors.push({
            type: "route",
            importance: "high",
            message: `Driving is currently estimated at about ${driveMinutes} minutes.`,
        });
    }

    if (result?.weather_notice) {
        factors.push({
            type: "weather",
            importance: "medium",
            message: result.weather_notice,
        });
    } else if (typeof result?.weather?.rain === "number" && result.weather.rain > 0) {
        factors.push({
            type: "weather",
            importance: "medium",
            message: "Rain is currently expected on the route.",
        });
    }

    if (factors.length === 0) {
        factors.push({
            type: "status",
            importance: "low",
            message: "Detailed reasoning will appear after the analysis finishes.",
        });
    }

    return factors.slice(0, 3);
}

function SvgShell({ children }: { children: ReactNode }) {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4"
            aria-hidden="true"
        >
            {children}
        </svg>
    );
}

function CarIcon() {
    return (
        <SvgShell>
            <path d="M5 16l1.4-5.1A2 2 0 0 1 8.34 9h7.32a2 2 0 0 1 1.94 1.9L19 16" />
            <path d="M4 16h16v3H4z" />
            <path d="M7 19v1" />
            <path d="M17 19v1" />
            <circle cx="7.5" cy="14" r="1" />
            <circle cx="16.5" cy="14" r="1" />
        </SvgShell>
    );
}

function TransitIcon() {
    return (
        <SvgShell>
            <rect x="6" y="3.5" width="12" height="14" rx="2.5" />
            <path d="M9 7h6" />
            <path d="M8 11.5h8" />
            <path d="M8 20l2-2" />
            <path d="M16 20l-2-2" />
            <circle cx="9" cy="14.5" r="0.8" />
            <circle cx="15" cy="14.5" r="0.8" />
        </SvgShell>
    );
}

function RouteIcon() {
    return (
        <SvgShell>
            <circle cx="6.5" cy="17.5" r="2" />
            <circle cx="17.5" cy="6.5" r="2" />
            <path d="M8.5 17.5h3a3 3 0 0 0 3-3v-1a3 3 0 0 1 3-3h0" />
        </SvgShell>
    );
}

function WeatherIcon() {
    return (
        <SvgShell>
            <circle cx="12" cy="12" r="3.2" />
            <path d="M12 4v2.2" />
            <path d="M12 17.8V20" />
            <path d="M4 12h2.2" />
            <path d="M17.8 12H20" />
            <path d="M6.3 6.3l1.6 1.6" />
            <path d="M16.1 16.1l1.6 1.6" />
            <path d="M17.7 6.3l-1.6 1.6" />
            <path d="M7.9 16.1l-1.6 1.6" />
        </SvgShell>
    );
}

function PreferenceIcon() {
    return (
        <SvgShell>
            <path d="M5 7h8" />
            <path d="M5 17h14" />
            <path d="M11 12h8" />
            <circle cx="15" cy="7" r="2" />
            <circle cx="9" cy="12" r="2" />
            <circle cx="13" cy="17" r="2" />
        </SvgShell>
    );
}

function RefreshIcon() {
    return (
        <SvgShell>
            <path d="M20 11a8 8 0 1 0 2 5.5" />
            <path d="M20 4v7h-7" />
        </SvgShell>
    );
}

function BellIcon() {
    return (
        <SvgShell>
            <path d="M6 9a6 6 0 1 1 12 0v4l1.5 2.5H4.5L6 13z" />
            <path d="M10 18a2 2 0 0 0 4 0" />
        </SvgShell>
    );
}
