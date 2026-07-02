"use client";

import Hero from "./Hero";
import CommuteForm from "./CommuteForm";
import RecommendationCard from "./RecommendationCard";
import InfoCards from "./InfoCards";
import { useGeolocation } from "../hooks/useGeolocation";
import { useEffect, useState } from "react";

export default function HomeClient() {
    const { location, error } = useGeolocation();
    const [result, setResult] = useState<any>(null);

    const handlePlanCommute = async () => {
        if (!location) {
            alert("Current location is not available yet.");
            return;
        }

        const response = await fetch("http://localhost:8000/commute/plan", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                latitude: location.latitude,
                longitude: location.longitude,
                destination: "Auckland CBD",
            }),
        });

        const data = await response.json();
        console.log(data);
        setResult(data);
    };
    useEffect(() => {
        if (!location) return;

        handlePlanCommute();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [location]);

    return (
        <main className="min-h-screen bg-gradient-to-br from-sky-100 via-indigo-100 to-orange-100 px-4 py-6 text-slate-900">
            <section className="mx-auto flex max-w-6xl flex-col gap-6">
                <div className="rounded-[24px] bg-white/70 p-5 text-sm shadow-lg backdrop-blur">
                    <p className="text-sm font-medium text-slate-500">📍 Current Location</p>

                    <p className="mt-2 text-lg font-semibold text-slate-900">
                        {result?.current_location ?? "Detecting your location..."}
                    </p>

                    {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
                        {result?.driving_route && (
                            <div className="mt-5 rounded-2xl bg-white/80 p-4">

                                <p className="text-sm font-medium text-slate-500">
                                    🚗 Driving
                                </p>

                                <p className="mt-2 text-xl font-semibold">
                                    {Math.round(parseInt(result.driving_route.duration) / 60)} min
                                </p>

                                <p className="text-sm text-slate-500">
                                    {(result.driving_route.distance_meters / 1000).toFixed(1)} km
                                </p>

                                {result?.weather && (
                                    <div className="mt-5 rounded-2xl bg-white/80 p-4">
                                        <p className="text-sm font-medium text-slate-500">🌤 Weather</p>

                                        <p className="mt-2 text-xl font-semibold text-slate-900">
                                            {result.weather.temperature}°C
                                        </p>

                                        <p className="mt-1 text-sm text-slate-500">
                                            Feels like {result.weather.feels_like}°C · Wind {result.weather.wind_speed} km/h
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}
                </div>

                <Hero />

                <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
                    <CommuteForm onPlan={handlePlanCommute} />
                    <RecommendationCard />
                </div>

                <InfoCards />
            </section>

        </main>
    );
}