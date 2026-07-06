"use client";

import { useRef } from "react";

type Weather = {
    rain: number | null;
    wind_speed: number | null;
    weather_code: number | null;
} | null;

type Props = {
    imageUrl: string | null;
    weather: Weather;
    onUploadImage: (file: File) => void;
};

function getMood(weather: Weather) {
    const hour = new Date().getHours();
    const isNight = hour < 6 || hour >= 19;
    const isRaining = (weather?.rain ?? 0) > 0;
    const isWindy = (weather?.wind_speed ?? 0) >= 30;
    const isRough = isRaining || isWindy;

    if (isNight) {
        return {
            isRaining,
            autoImageSrc: weather ? (isRough ? "/Cloudy_Auckland.png" : "/Sunny_Auckland.png") : null,
            overlay: "linear-gradient(180deg, rgba(10,14,35,0.55) 0%, rgba(10,14,35,0.75) 100%)",
            fallbackGradient: "linear-gradient(160deg, #0f1530 0%, #1c2240 55%, #2b2f52 100%)",
        };
    }

    if (isRaining) {
        return {
            isRaining,
            autoImageSrc: "/Cloudy_Auckland.png",
            overlay: "linear-gradient(180deg, rgba(60,70,90,0.35) 0%, rgba(40,48,65,0.55) 100%)",
            fallbackGradient: "linear-gradient(160deg, #7c8aa0 0%, #5b6579 55%, #454d60 100%)",
        };
    }

    if (isWindy) {
        return {
            isRaining,
            autoImageSrc: "/Cloudy_Auckland.png",
            overlay: "linear-gradient(180deg, rgba(120,140,160,0.2) 0%, rgba(90,105,125,0.4) 100%)",
            fallbackGradient: "linear-gradient(160deg, #a9c0d6 0%, #7f97ad 55%, #5f7488 100%)",
        };
    }

    return {
        isRaining,
        autoImageSrc: weather ? "/Sunny_Auckland.png" : null,
        overlay: "linear-gradient(180deg, rgba(255,214,150,0.15) 0%, rgba(120,110,150,0.35) 100%)",
        fallbackGradient: "linear-gradient(160deg, #ffd8a8 0%, #f3a9e0 55%, #7c6fae 100%)",
    };
}

export default function BackgroundScene({ imageUrl, weather, onUploadImage }: Props) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const mood = getMood(weather);
    const displayImageSrc = imageUrl ?? mood.autoImageSrc;

    return (
        <div className="fixed inset-0 -z-10 overflow-hidden">
            {displayImageSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={displayImageSrc} alt="" className="h-full w-full object-cover" />
            ) : (
                <div className="h-full w-full" style={{ background: mood.fallbackGradient }} />
            )}

            <div className="absolute inset-0" style={{ background: mood.overlay }} />

            {mood.isRaining && (
                <div className="rain-layer pointer-events-none absolute inset-0 opacity-60" />
            )}

            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) {
                        onUploadImage(file);
                    }
                }}
            />
            <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-5 right-5 rounded-full border border-white/30 bg-black/20 px-4 py-2 text-xs font-medium text-white backdrop-blur-md transition hover:bg-black/35"
            >
                Change background
            </button>
        </div>
    );
}
