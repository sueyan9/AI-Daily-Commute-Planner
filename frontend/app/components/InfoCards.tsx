type CommutePlan = {
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

type Props = {
    result: CommutePlan | null;
    arrivalTime: string;
    preference: string;
};

export default function InfoCards({ result, arrivalTime, preference }: Props) {
    const driveMinutes = getDriveMinutes(result?.driving_route?.duration);
    const weather = result?.weather;

    return (
        <section className="grid gap-4 md:grid-cols-3">
            <div className="rounded-[24px] bg-white/65 p-5 shadow-lg backdrop-blur">
                <p className="text-sm text-slate-500">Traffic</p>
                <h3 className="mt-2 text-xl font-bold">
                    {driveMinutes ? `${driveMinutes} min by road` : "Waiting for route data"}
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                    Separate delay breakdown is not available yet, so the current
                    driving estimate is the clearest traffic signal on the page.
                </p>
            </div>

            <div className="rounded-[24px] bg-white/65 p-5 shadow-lg backdrop-blur">
                <p className="text-sm text-slate-500">Weather</p>
                <h3 className="mt-2 text-xl font-bold">
                    {typeof weather?.temperature === "number"
                        ? `${Math.round(weather.temperature)}°C`
                        : "Waiting for weather"}
                    {typeof weather?.rain === "number" && weather.rain > 0 ? " · Rain" : ""}
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                    {result?.weather_notice ??
                        (typeof weather?.wind_speed === "number"
                            ? `Feels like ${Math.round(weather.feels_like ?? weather.temperature ?? 0)}°C with ${Math.round(weather.wind_speed)} km/h wind.`
                            : "Weather guidance will appear after analysis.")}
                </p>
            </div>

            <div className="rounded-[24px] bg-white/65 p-5 shadow-lg backdrop-blur">
                <p className="text-sm text-slate-500">Alternatives</p>
                <h3 className="mt-2 text-xl font-bold">Best current option: driving</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                    Arrive by {formatTime(arrivalTime)} with preference set to {preference.toLowerCase()}.
                    Transit comparison can slot into this card once the public transport
                    routing API is connected.
                </p>
            </div>
        </section>
    );
}

function getDriveMinutes(duration: string | undefined): number | null {
    if (!duration || !duration.endsWith("s")) {
        return null;
    }

    const seconds = Number.parseInt(duration.slice(0, -1), 10);
    if (Number.isNaN(seconds)) {
        return null;
    }

    return Math.round(seconds / 60);
}

function formatTime(value: string): string {
    const [hours, minutes] = value.split(":").map(Number);
    if (Number.isNaN(hours) || Number.isNaN(minutes)) {
        return value;
    }

    const period = hours >= 12 ? "PM" : "AM";
    const normalizedHours = hours % 12 || 12;
    return `${normalizedHours}:${String(minutes).padStart(2, "0")} ${period}`;
}
