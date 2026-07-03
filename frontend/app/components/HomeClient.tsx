"use client";

import CommuteForm from "./CommuteForm";
import RecommendationCard from "./RecommendationCard";
import InfoCards from "./InfoCards";
import { useGeolocation } from "../hooks/useGeolocation";
import { useEffect, useState } from "react";

type CommutePlan = {
    current_location: string | null;
    destination: string;
    driving_route: {
        duration: string;
        distance_meters: number;
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
        <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(191,219,254,0.95),_rgba(224,231,255,0.88)_42%,_rgba(255,237,213,0.82)_100%)] px-4 py-6 text-slate-900">
            <section className="mx-auto flex max-w-6xl flex-col gap-6">
                <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
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

                <InfoCards
                    result={result}
                    arrivalTime={arrivalTime}
                    preference={preference}
                />
            </section>
        </main>
    );
}
