"use client";

type Weather = {
    rain: number | null;
    wind_speed: number | null;
    weather_code: number | null;
} | null;

type Props = {
    imageUrl: string | null;
    weather: Weather;
};

const FOG_WEATHER_CODES = new Set([45, 48]);

function getMood(weather: Weather) {
    const hour = new Date().getHours();
    const isNight = hour < 6 || hour >= 19;
    const isRaining = (weather?.rain ?? 0) > 0;
    const isFoggy = FOG_WEATHER_CODES.has(weather?.weather_code ?? -1);
    const isWindy = (weather?.wind_speed ?? 0) >= 30;

    const dayImageSrc = isRaining
        ? "/Rainy-auckland.png"
        : isFoggy
          ? "/foggy-Auckland.png"
          : isWindy
            ? "/Cloudy_Auckland.png"
            : "/Sunny_Auckland.png";

    if (isNight) {
        return {
            isRaining,
            autoImageSrc: dayImageSrc,
            overlay: "linear-gradient(180deg, rgba(10,14,35,0.55) 0%, rgba(10,14,35,0.75) 100%)",
        };
    }

    if (isRaining) {
        return {
            isRaining,
            autoImageSrc: dayImageSrc,
            overlay: "linear-gradient(180deg, rgba(60,70,90,0.35) 0%, rgba(40,48,65,0.55) 100%)",
        };
    }

    if (isFoggy) {
        return {
            isRaining,
            autoImageSrc: dayImageSrc,
            overlay: "linear-gradient(180deg, rgba(190,195,205,0.15) 0%, rgba(160,165,175,0.3) 100%)",
        };
    }

    if (isWindy) {
        return {
            isRaining,
            autoImageSrc: dayImageSrc,
            overlay: "linear-gradient(180deg, rgba(120,140,160,0.2) 0%, rgba(90,105,125,0.4) 100%)",
        };
    }

    return {
        isRaining,
        autoImageSrc: dayImageSrc,
        overlay: "linear-gradient(180deg, rgba(255,214,150,0.15) 0%, rgba(120,110,150,0.35) 100%)",
    };
}

export default function BackgroundScene({ imageUrl, weather }: Props) {
    const mood = getMood(weather);
    const displayImageSrc = imageUrl ?? mood.autoImageSrc;

    return (
        <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={displayImageSrc} alt="" className="h-full w-full object-cover" />

            <div className="absolute inset-0" style={{ background: mood.overlay }} />

            {mood.isRaining && (
                <div className="rain-layer pointer-events-none absolute inset-0 opacity-60" />
            )}
        </div>
    );
}
