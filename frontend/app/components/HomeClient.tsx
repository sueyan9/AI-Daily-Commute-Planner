"use client";

import BackgroundScene from "./BackgroundScene";
import CommuteToolbar from "./CommuteToolbar";
import RecommendationCard from "./RecommendationCard";
import SettingsMenu from "./SettingsMenu";
import { useGeolocation } from "../hooks/useGeolocation";
import { useGoogleCalendar } from "../hooks/useGoogleCalendar";
import { useEffect, useRef, useState } from "react";

type CommutePlan = {
    current_location: string | null;
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
        headline: string;
        reason: string;
        summary: string;
        decision_factors: Array<{
            type: string;
            importance: "low" | "medium" | "high";
            message: string;
        }>;
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
        destination: string;
    } | null;
};

type StoredPlan = {
    destination: string;
    arrivalTime: string;
    preference: string;
};

const LAST_PLAN_KEY = "leavewise:last-plan";

function formatRelativeTime(date: Date | null): string | null {
    if (!date) {
        return null;
    }

    const minutesAgo = Math.floor((Date.now() - date.getTime()) / 60000);
    if (minutesAgo <= 0) {
        return "Last updated just now";
    }
    if (minutesAgo === 1) {
        return "Last updated 1 min ago";
    }

    return `Last updated ${minutesAgo} min ago`;
}

function readStoredPlan(): StoredPlan | null {
    if (typeof window === "undefined") {
        return null;
    }

    try {
        const raw = window.localStorage.getItem(LAST_PLAN_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}

export default function HomeClient() {
    const { location, error } = useGeolocation();
    const {
        isConnected: isCalendarConnected,
        nextEvent,
        suggestedArrivalTime,
        connect: connectCalendar,
        disconnect: disconnectCalendar,
    } = useGoogleCalendar();
    const [result, setResult] = useState<CommutePlan | null>(null);
    const [requestError, setRequestError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [backgroundImageUrl, setBackgroundImageUrl] = useState<string | null>(null);
    const [destination, setDestination] = useState("Auckland CBD");
    const [arrivalTime, setArrivalTime] = useState("");
    const [preference, setPreference] = useState("Fastest route");
    const [hasStoredPlan, setHasStoredPlan] = useState(false);
    const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);
    const hasAutoPlannedRef = useRef(false);
    const hasAppliedCalendarTimeRef = useRef(false);

    useEffect(() => {
        if (suggestedArrivalTime && !hasAppliedCalendarTimeRef.current) {
            hasAppliedCalendarTimeRef.current = true;
            setArrivalTime(suggestedArrivalTime);
        }
    }, [suggestedArrivalTime]);

    useEffect(() => {
        const stored = readStoredPlan();
        if (stored) {
            // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time sync from localStorage after hydration
            setDestination(stored.destination);
            setArrivalTime(stored.arrivalTime);
            setPreference(stored.preference);
            setHasStoredPlan(true);
        }
    }, []);

    const handlePlanCommute = async () => {
        if (!location) {
            alert("Current location is not available yet.");
            return;
        }

        setIsLoading(true);
        setRequestError(null);

        try {
            const response = await fetch("http://localhost:8000/commute/plan", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    latitude: location.latitude,
                    longitude: location.longitude,
                    destination,
                    arrival_time: arrivalTime || null,
                    preference,
                }),
            });

            if (!response.ok) {
                throw new Error("Backend request failed.");
            }

            const data: CommutePlan = await response.json();
            setResult(data);
            setLastUpdatedAt(new Date());
            window.localStorage.setItem(
                LAST_PLAN_KEY,
                JSON.stringify({ destination, arrivalTime, preference })
            );
        } catch {
            setRequestError("Unable to load the latest commute recommendation.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (location && hasStoredPlan && !result && !isLoading && !hasAutoPlannedRef.current) {
            hasAutoPlannedRef.current = true;
            handlePlanCommute();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [location, hasStoredPlan, result, isLoading]);

    return (
        <main className="relative min-h-screen overflow-hidden">
            <BackgroundScene imageUrl={backgroundImageUrl} weather={result?.weather ?? null} />
            <SettingsMenu
                onUploadImage={(file) => setBackgroundImageUrl(URL.createObjectURL(file))}
                isCalendarConnected={isCalendarConnected}
                onConnectCalendar={connectCalendar}
                onDisconnectCalendar={disconnectCalendar}
            />

            <div className="relative z-10 flex min-h-screen flex-col gap-6 px-4 pb-6 pt-8 md:px-10 md:pb-8 md:pt-12">
                <div className="flex flex-col items-center gap-2">
                    <CommuteToolbar
                        destination={destination}
                        arrivalTime={arrivalTime}
                        preference={preference}
                        onDestinationChange={setDestination}
                        onArrivalTimeChange={setArrivalTime}
                        onPreferenceChange={setPreference}
                        onPlan={handlePlanCommute}
                        isLoading={isLoading}
                    />
                    {nextEvent && (
                        <p className="text-xs text-white/80">
                            📅 Next: {nextEvent.summary} · Arrive by {arrivalTime}
                        </p>
                    )}
                </div>

                {error && (
                    <div className="w-full max-w-2xl rounded-2xl border border-rose-200 bg-rose-50/90 px-4 py-3 text-sm text-rose-700 backdrop-blur">
                        {error}
                    </div>
                )}

                <div className="flex flex-1 flex-col items-center justify-end gap-6 lg:justify-start">
                    <RecommendationCard
                        result={result}
                        isLoading={isLoading}
                        error={requestError}
                        arrivalTime={arrivalTime}
                        lastUpdatedLabel={formatRelativeTime(lastUpdatedAt)}
                    />
                </div>
            </div>
        </main>
    );
}
