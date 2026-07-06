"use client";
import { useCallback, useEffect, useState } from "react";

const API_BASE = "http://localhost:8000";
const ARRIVAL_BUFFER_MINUTES = 10;

type CalendarEvent = {
    summary: string;
    location: string | null;
    start_time: string;
};

function toArrivalTime(startTimeIso: string): string {
    const eventStart = new Date(startTimeIso);
    const target = new Date(eventStart.getTime() - ARRIVAL_BUFFER_MINUTES * 60000);
    const hours = String(target.getHours()).padStart(2, "0");
    const minutes = String(target.getMinutes()).padStart(2, "0");
    return `${hours}:${minutes}`;
}

export function useGoogleCalendar() {
    const [isConnected, setIsConnected] = useState(false);
    const [nextEvent, setNextEvent] = useState<CalendarEvent | null>(null);

    const refreshNextEvent = useCallback(async () => {
        try {
            const response = await fetch(`${API_BASE}/calendar/next-event`);
            const data = await response.json();
            setIsConnected(Boolean(data.connected));
            setNextEvent(data.event ?? null);
        } catch {
            // Calendar is a convenience feature; silently leave state as-is on failure.
        }
    }, []);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time fetch of calendar status on mount
        refreshNextEvent();
    }, [refreshNextEvent]);

    const connect = useCallback(() => {
        const popup = window.open(
            `${API_BASE}/calendar/oauth/login`,
            "google-calendar-auth",
            "width=480,height=640"
        );
        if (!popup) {
            return;
        }

        const timer = setInterval(() => {
            if (popup.closed) {
                clearInterval(timer);
                refreshNextEvent();
            }
        }, 500);
    }, [refreshNextEvent]);

    const disconnect = useCallback(async () => {
        await fetch(`${API_BASE}/calendar/disconnect`, { method: "POST" });
        setIsConnected(false);
        setNextEvent(null);
    }, []);

    const suggestedArrivalTime = nextEvent ? toArrivalTime(nextEvent.start_time) : null;

    return { isConnected, nextEvent, suggestedArrivalTime, connect, disconnect };
}
