"use client";
import { useState } from "react";

export type SavedLocation = {
    id: string;
    label: string;
    address: string;
};

const STORAGE_KEY = "leavewise:saved-locations";

function readStoredLocations(): SavedLocation[] {
    if (typeof window === "undefined") {
        return [];
    }

    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

export function useSavedLocations() {
    const [locations, setLocations] = useState<SavedLocation[]>(readStoredLocations);

    const persist = (next: SavedLocation[]) => {
        setLocations(next);
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    };

    const addLocation = (label: string, address: string) => {
        persist([...locations, { id: crypto.randomUUID(), label, address }]);
    };

    const removeLocation = (id: string) => {
        persist(locations.filter((location) => location.id !== id));
    };

    return { locations, addLocation, removeLocation };
}
