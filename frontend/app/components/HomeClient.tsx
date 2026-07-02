"use client";

import Hero from "./Hero";
import CommuteForm from "./CommuteForm";
import RecommendationCard from "./RecommendationCard";
import InfoCards from "./InfoCards";
import { useGeolocation } from "../hooks/useGeolocation";

export default function HomeClient() {
    const { location, error } = useGeolocation();

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
                    <CommuteForm />
                    <RecommendationCard />
                </div>

                <InfoCards />
            </section>
        </main>
    );
}