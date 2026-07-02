"use client";

import Hero from "./Hero";
import CommuteForm from "./CommuteForm";
import RecommendationCard from "./RecommendationCard";
import InfoCards from "./InfoCards";
import { useGeolocation } from "../hooks/useGeolocation";
import { useState } from "react";

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

    return (
        <main className="min-h-screen bg-gradient-to-br from-sky-100 via-indigo-100 to-orange-100 px-4 py-6 text-slate-900">
            <section className="mx-auto flex max-w-6xl flex-col gap-6">
                <div className="rounded-2xl bg-white/70 p-4 text-sm">
                    <p>Latitude: {location?.latitude ?? "Loading..."}</p>
                    <p>Longitude: {location?.longitude ?? "Loading..."}</p>
                    {error && <p className="text-red-500">{error}</p>}
                </div>

                <Hero />

                <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
                    <CommuteForm onPlan={handlePlanCommute} />
                    <RecommendationCard />
                </div>

                <InfoCards />
            </section>
            {result && (
                <div className="rounded-2xl bg-white/70 p-4 text-sm">
                    <p className="font-semibold">Backend Result</p>
                    <p>Current location: {result.current_location}</p>
                    <p>Destination: {result.destination}</p>
                </div>
            )}
        </main>
    );
}