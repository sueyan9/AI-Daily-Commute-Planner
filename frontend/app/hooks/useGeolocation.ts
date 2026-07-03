"use client";
import { useEffect, useState } from "react";

export function useGeolocation() {
    const [location, setLocation] = useState<GeolocationCoordinates | null>(null);
    const [error, setError] = useState(() =>
        typeof navigator !== "undefined" && !navigator.geolocation
            ? "Geolocation is not supported."
            : ""
    );

    useEffect(() => {
        if (!navigator.geolocation) {
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                setLocation(position.coords);
            },
            (err) => {
                console.error("Geolocation error:", err);
                setError(err.message);
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0,
            }
        );
    }, []);

    return {
        location,
        error,
    };
}
