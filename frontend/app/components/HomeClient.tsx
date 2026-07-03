"use client";

import CommuteForm from "./CommuteForm";
import RecommendationCard from "./RecommendationCard";
import { useGeolocation } from "../hooks/useGeolocation";
import { useEffect, useState } from "react";

type CommutePlan = {
    current_location: string | null;
    destination: string;
    driving_route: {
        duration: string;
        distance_meters: number;
        static_duration?: string | null;
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
            };
        };
        destination: string;
    } | null;
};

export default function HomeClient() {
    const { location, error } = useGeolocation();
    const [result, setResult] = useState<CommutePlan | null>(null);
    const [requestError, setRequestError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [destination, setDestination] = useState("Auckland CBD");
    const [arrivalTime, setArrivalTime] = useState("18:25");
    const [preference, setPreference] = useState("Fewer transfers");

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
                    arrival_time: arrivalTime,
                    preference,
                }),
            });

            if (!response.ok) {
                throw new Error("Backend request failed.");
            }

            const data: CommutePlan = await response.json();
            setResult(data);
        } catch {
            setRequestError("Unable to load the latest commute recommendation.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (!location) return;

        const timeoutId = window.setTimeout(() => {
            void handlePlanCommute();
        }, 0);

        return () => window.clearTimeout(timeoutId);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [location]);

    return (
        <main className="min-h-screen bg-[var(--background)] px-4 py-6 text-[var(--foreground)] md:px-6 md:py-8">
            <section className="mx-auto max-w-7xl">
                <div className="overflow-hidden rounded-[32px] border border-[var(--line)] bg-[var(--panel)] shadow-[0_12px_40px_rgba(28,28,46,0.05)]">
                    <div className="grid lg:grid-cols-[360px_1fr]">
                    <CommuteForm
                        currentLocation={result?.current_location ?? "Detecting your location..."}
                        destination={destination}
                        arrivalTime={arrivalTime}
                        preference={preference}
                        onDestinationChange={setDestination}
                        onArrivalTimeChange={setArrivalTime}
                        onPreferenceChange={setPreference}
                        onPlan={handlePlanCommute}
                        isLoading={isLoading}
                        locationError={error}
                    />
                    <RecommendationCard
                        result={result}
                        isLoading={isLoading}
                        error={requestError}
                        arrivalTime={arrivalTime}
                        preference={preference}
                    />
                    </div>
                </div>
            </section>
        </main>
    );
}
