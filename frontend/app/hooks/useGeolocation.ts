"use client";
import { useEffect, useState } from "react";

export function useGeolocation() {
    const [location, setLocation] = useState<GeolocationCoordinates | null>(null);
    const [error, setError] = useState("");

    useEffect(() => {
        if (!navigator.geolocation) {
            setError("Geolocation is not supported.");
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                setLocation(position.coords);
            },
            (err) => {
                setError(err.message);
            }
        );
    }, []);

    return {
        location,
        error,
    };
}