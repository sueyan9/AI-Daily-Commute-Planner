import type { ReactNode } from "react";

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
};

export default function RecommendationCard({
    result,
    isLoading,
    error,
    arrivalTime,
}: Props) {
    const decision = result?.decision;
    const factors = decision?.decision_factors ?? getFallbackFactors(result);
    const comparison = decision?.comparison;
    const leaveTime =
        decision?.leave_time ??
        getFallbackLeaveTime(arrivalTime, result?.driving_route?.duration) ??
        getCurrentTimeDisplay();
    const arriveTime = decision?.arrival_time ?? formatTime(arrivalTime) ?? "--";
    const driveMinutes =
        comparison?.driving.travel_time_minutes ?? getDriveMinutes(result?.driving_route?.duration);
    const recommendedMode = decision?.recommended_mode ?? comparison?.recommended_mode ?? "driving";
    const trafficStatus =
        decision?.traffic?.tag ??
        getTrafficFallback(result?.driving_route?.duration, result?.driving_route?.static_duration);
    const transitMinutes = comparison?.transit.travel_time_minutes ?? result?.transit_route?.travel_time_minutes;
    const transitHeadline =
        comparison?.transit.route_label ?? result?.transit_route?.route_label ?? "Public transport";
    const nextTransitTimes = (comparison?.transit.next_departures ?? result?.transit_route?.next_departures ?? [])
        .map((departure) => departure.time)
        .slice(0, 3)
        .join(" · ");
    const transitStatus = comparison?.transit.available
        ? `${transitHeadline}${nextTransitTimes ? ` · ${nextTransitTimes}` : ""}`
        : comparison?.transit.status ?? "Transit routing is not connected yet.";

    return (
        <section className="p-6 md:p-8">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <p className="ui-label">Ai recommendation</p>
                    <h2 className="mt-3 text-[1.65rem] font-semibold tracking-[-0.04em] text-[var(--foreground)]">
                        Leave at a glance
                    </h2>
                </div>
                <StatusBadge
                    label={error ? "Service issue" : isLoading ? "Refreshing" : "Confidence 92%"}
                    tone={error ? "warning" : "normal"}
                />
            </div>

            <div className="ui-rule mt-8 border rounded-[28px] bg-[var(--panel-strong)] p-6 md:p-8">
                <div className="grid gap-8 xl:grid-cols-[1.3fr_0.8fr] xl:items-start">
                    <div>
                        <p className="ui-label">Leave at</p>
                        <div className="mt-3 flex items-end gap-3 text-[clamp(4.6rem,10vw,7.2rem)] font-semibold leading-none tracking-[-0.08em] text-[var(--foreground)]">
                            <span>{error ? "--" : isLoading ? "..." : getTimeParts(leaveTime).time}</span>
                            <span className="pb-3 text-[0.3em] tracking-[-0.04em] text-[var(--foreground)]/90">
                                {error ? "" : isLoading ? "" : getTimeParts(leaveTime).period}
                            </span>
                        </div>
                        <p className="mt-4 text-[1.35rem] font-medium tracking-[-0.03em] text-[var(--accent)]">
                            {error
                                ? "Recommendation unavailable"
                                : isLoading
                                  ? "Analyzing live conditions"
                                  : `${decision?.recommended_label ?? "Drive"} · ${driveMinutes ? `${driveMinutes} min` : "Timing pending"}`}
                        </p>
                        <p className="mt-3 max-w-xl text-[15px] leading-7 text-[var(--muted)]">
                            {error
                                ? error
                                : isLoading
                                  ? "Checking traffic, timing, and weather to decide the cleanest departure window."
                                  : decision?.reason ??
                                    result?.recommendation ??
                                    "A live recommendation will appear here after the route and weather data load."}
                        </p>
                    </div>

                    <div className="ui-rule border-t pt-6 xl:border-t-0 xl:border-l xl:pl-8 xl:pt-0">
                        <p className="ui-label">Arrive by</p>
                        <p className="mt-4 text-[clamp(2.4rem,4vw,3.4rem)] font-semibold tracking-[-0.06em] text-[var(--foreground)]">
                            {error ? "--" : isLoading ? "Checking" : arriveTime}
                        </p>
                        <div className="mt-8 space-y-4">
                            <KeyValue
                                icon={<RouteIcon />}
                                label="Recommended"
                                value={decision?.recommended_label ?? "Drive"}
                            />
                            <KeyValue
                                icon={<ClockIcon />}
                                label="Travel time"
                                value={driveMinutes ? `${driveMinutes} min` : "Pending"}
                            />
                            <KeyValue
                                icon={<TrafficIcon />}
                                label="Traffic"
                                value={trafficStatus}
                            />
                            <KeyValue
                                icon={<WeatherIcon />}
                                label="Conditions"
                                value={result?.weather_notice ?? "Current weather clear enough to travel"}
                            />
                        </div>
                    </div>
                </div>
            </div>

            <section className="mt-10">
                <div className="flex items-center justify-between">
                    <p className="ui-label">{comparison?.title ?? "Today's options"}</p>
                    <p className="text-sm text-[var(--muted)]">Preferred mode highlighted in violet</p>
                </div>

                <div className="ui-rule mt-4 overflow-hidden rounded-[24px] border bg-[var(--panel-strong)]">
                    <OptionRow
                        icon={<CarIcon />}
                        label={comparison?.driving.label ?? "Drive"}
                        travelTime={driveMinutes ? `${driveMinutes} min` : "--"}
                        leaveValue={comparison?.driving.leave_time ?? leaveTime}
                        arriveValue={comparison?.driving.arrival_time ?? arriveTime}
                        isRecommended={recommendedMode === "driving"}
                    />
                    <OptionRow
                        icon={<TransitIcon />}
                        label={comparison?.transit.route_label ?? comparison?.transit.label ?? "Public transport"}
                        travelTime={comparison?.transit.available ? `${transitMinutes ?? "--"} min` : "--"}
                        leaveValue={
                            comparison?.transit.available
                                ? comparison?.transit.departure_time ?? transitStatus ?? "Live"
                                : transitStatus ?? "Pending"
                        }
                        arriveValue={
                            comparison?.transit.available
                                ? comparison?.transit.arrival_time ?? "Live"
                                : "Not ready"
                        }
                        isRecommended={recommendedMode === "transit"}
                        condensedStatus={!comparison?.transit.available}
                        note={
                            comparison?.transit.available
                                ? comparison?.transit.status
                                : undefined
                        }
                    />
                </div>
            </section>

            <section className="mt-10">
                <p className="ui-label">Why this recommendation</p>
                <div className="ui-rule mt-4 grid overflow-hidden rounded-[24px] border bg-[var(--panel-strong)] md:grid-cols-3">
                    {factors.map((factor, index) => (
                        <ReasonColumn
                            key={`${factor.type}-${factor.message}`}
                            factor={factor}
                            withDivider={index < factors.length - 1}
                        />
                    ))}
                </div>
            </section>
        </section>
    );
}

function StatusBadge({
    label,
    tone,
}: {
    label: string;
    tone: "normal" | "warning";
}) {
    return (
        <span
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-medium ${
                tone === "warning"
                    ? "border-rose-200 bg-rose-50 text-rose-700"
                    : "border-[var(--line)] bg-[var(--panel-strong)] text-[var(--foreground)]"
            }`}
        >
            <span
                className={`h-2.5 w-2.5 rounded-full ${
                    tone === "warning" ? "bg-rose-500" : "bg-emerald-500"
                }`}
            />
            {label}
        </span>
    );
}

function KeyValue({
    icon,
    label,
    value,
}: {
    icon: ReactNode;
    label: string;
    value: string;
}) {
    return (
        <div className="flex items-start gap-3">
            <span className="mt-0.5 text-[var(--accent)]">{icon}</span>
            <div>
                <p className="ui-label">{label}</p>
                <p className="mt-2 text-[15px] leading-6 text-[var(--foreground)]">{value}</p>
            </div>
        </div>
    );
}

function OptionRow({
    icon,
    label,
    travelTime,
    leaveValue,
    arriveValue,
    isRecommended,
    condensedStatus = false,
    note,
}: {
    icon: ReactNode;
    label: string;
    travelTime: string;
    leaveValue: string;
    arriveValue: string;
    isRecommended: boolean;
    condensedStatus?: boolean;
    note?: string;
}) {
    return (
        <div
            className={`grid gap-4 border-b border-[var(--line)] px-5 py-5 last:border-b-0 md:grid-cols-[minmax(0,1.3fr)_120px_minmax(0,1fr)_160px] md:items-center ${
                isRecommended ? "bg-[var(--accent-soft)]/45" : "bg-[var(--panel-strong)]"
            }`}
        >
            <div className="flex items-center gap-3">
                <span
                    className={`flex h-10 w-10 items-center justify-center rounded-full border ${
                        isRecommended
                            ? "border-[var(--accent)]/20 bg-[var(--accent-soft)] text-[var(--accent)]"
                            : "border-[var(--line)] bg-[var(--background)] text-[var(--muted)]"
                    }`}
                >
                    {icon}
                </span>
                <div>
                    <p className="text-lg font-medium tracking-[-0.03em] text-[var(--foreground)]">{label}</p>
                    {isRecommended && <p className="mt-1 text-sm text-[var(--accent)]">Recommended now</p>}
                    {note && <p className="mt-1 text-sm text-[var(--muted)]">{note}</p>}
                </div>
            </div>
            <div>
                <p className="ui-label">Duration</p>
                <p className="mt-2 text-[15px] font-medium text-[var(--foreground)]">{travelTime}</p>
            </div>
            <div>
                <p className="ui-label">Leave</p>
                <p className="mt-2 text-[15px] leading-6 text-[var(--muted)]">
                    {condensedStatus ? leaveValue : leaveValue || "--"}
                </p>
            </div>
            <div>
                <p className="ui-label">Arrive</p>
                <p className="mt-2 text-[15px] leading-6 text-[var(--muted)]">{arriveValue || "--"}</p>
            </div>
        </div>
    );
}

function ReasonColumn({
    factor,
    withDivider,
}: {
    factor: DecisionFactor;
    withDivider: boolean;
}) {
    const icon = getFactorIcon(factor.type);
    const emphasis =
        factor.importance === "high"
            ? "High priority"
            : factor.importance === "medium"
              ? "Monitored"
              : "Supporting";

    return (
        <div
            className={`p-5 md:p-6 ${
                withDivider ? "border-b border-[var(--line)] md:border-r md:border-b-0" : ""
            }`}
        >
            <span className="text-[var(--accent)]">{icon}</span>
            <p className="mt-4 ui-label">{factor.type}</p>
            <p className="mt-3 text-[17px] font-medium tracking-[-0.02em] text-[var(--foreground)]">
                {emphasis}
            </p>
            <p className="mt-3 text-[15px] leading-7 text-[var(--muted)]">{factor.message}</p>
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

function getFallbackLeaveTime(
    arrivalTime: string,
    driveDuration: string | undefined
): string | null {
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

    return formatTime(
        `${String(outputHours).padStart(2, "0")}:${String(outputMinutes).padStart(2, "0")}`
    );
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

function getTrafficFallback(
    duration: string | undefined,
    staticDuration: string | null | undefined
): string {
    const liveMinutes = getDriveMinutes(duration);
    const staticMinutes = getDriveMinutes(staticDuration ?? undefined);

    if (!liveMinutes || !staticMinutes || staticMinutes <= 0) {
        return "Live traffic included";
    }

    const deltaMinutes = liveMinutes - staticMinutes;
    const deltaRatio = deltaMinutes / staticMinutes;

    if (deltaMinutes >= 10 || deltaRatio >= 0.35) {
        return "Heavy traffic";
    }

    if (deltaMinutes >= 5 || deltaRatio >= 0.15) {
        return "Moderate traffic";
    }

    return "Normal traffic";
}

function getTimeParts(value: string) {
    const match = value.match(/^(.+)\s(AM|PM)$/);
    if (!match) {
        return { time: value, period: "" };
    }

    return { time: match[1], period: match[2] };
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
            className="h-5 w-5"
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

function ClockIcon() {
    return (
        <SvgShell>
            <circle cx="12" cy="12" r="8" />
            <path d="M12 7.5v5l3 1.8" />
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

function TrafficIcon() {
    return (
        <SvgShell>
            <path d="M4 16h16" />
            <path d="M7 12h10" />
            <path d="M10 8h4" />
            <circle cx="7" cy="16.5" r="1.2" />
            <circle cx="12" cy="12.5" r="1.2" />
            <circle cx="17" cy="16.5" r="1.2" />
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
