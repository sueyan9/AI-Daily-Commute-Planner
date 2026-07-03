type CommutePlan = {
    destination: string;
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
    isLoading: boolean;
    error: string | null;
    arrivalTime: string;
    preference: string;
};

export default function RecommendationCard({
    result,
    isLoading,
    error,
    arrivalTime,
    preference,
}: Props) {
    const driveMinutes = getDriveMinutes(result?.driving_route?.duration);
    const driveDistance = result?.driving_route?.distance_meters;
    const weather = result?.weather;
    const suggestedDeparture = getSuggestedDeparture(arrivalTime, driveMinutes);
    const routeLabel = getRouteLabel(result?.recommendation);

    return (
        <section className="rounded-[30px] bg-white/68 p-6 shadow-xl shadow-slate-200/70 backdrop-blur">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <p className="text-sm font-medium text-indigo-500">Best route today</p>
                    <h2 className="mt-2 text-4xl font-bold tracking-tight text-slate-950 md:text-5xl">
                        {suggestedDeparture ?? "--:--"}
                    </h2>
                    <p className="mt-2 text-base text-slate-600">
                        Leave by this time to arrive around {formatTime(arrivalTime)}.
                    </p>
                </div>

                <div className="rounded-2xl bg-indigo-50/90 px-4 py-3">
                    <p className="text-xs text-slate-500">Status</p>
                    <p className="mt-1 text-xl font-bold text-indigo-600">
                        {isLoading ? "Loading" : result ? "Ready" : "Idle"}
                    </p>
                </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3 text-sm">
                <span className="rounded-full bg-white/80 px-4 py-2 font-medium text-slate-700 shadow-sm">
                    {routeLabel}
                </span>
                <span className="rounded-full bg-white/80 px-4 py-2 font-medium text-slate-700 shadow-sm">
                    {result?.destination ?? "Waiting for destination"}
                </span>
                <span className="rounded-full bg-white/80 px-4 py-2 font-medium text-slate-700 shadow-sm">
                    Preference: {preference}
                </span>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-4">
                <StatCard
                    icon="⏱"
                    title="Travel time"
                    value={driveMinutes ? `${driveMinutes} min` : "--"}
                />
                <StatCard
                    icon="🕓"
                    title="Arrival"
                    value={formatTime(arrivalTime)}
                />
                <StatCard
                    icon="🛣"
                    title="Distance"
                    value={
                        typeof driveDistance === "number"
                            ? `${(driveDistance / 1000).toFixed(1)} km`
                            : "--"
                    }
                />
                <StatCard
                    icon="🌤"
                    title="Weather"
                    value={
                        typeof weather?.temperature === "number"
                            ? `${Math.round(weather.temperature)}°C`
                            : "--"
                    }
                />
            </div>

            <div className="mt-8 rounded-3xl bg-gradient-to-r from-indigo-50 to-sky-50 p-6">
                <div className="flex items-center gap-2">
                    <span className="text-xl">🤖</span>
                    <h3 className="font-semibold text-slate-900">Recommendation</h3>
                </div>

                <p className="mt-4 min-h-24 text-base leading-7 text-slate-600">
                    {error
                        ? error
                        : isLoading
                          ? "Checking your route, weather, and recommendation..."
                          : result?.recommendation ??
                            "Recommendation will appear here after route analysis."}
                </p>

                {result?.weather_notice && (
                    <div className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
                        {result.weather_notice}
                    </div>
                )}

                <div className="mt-5 grid gap-3 md:grid-cols-3">
                    <div className="rounded-2xl bg-white/80 p-4">
                        <p className="text-sm text-slate-500">Suggested leave time</p>
                        <p className="mt-1 text-3xl font-bold text-indigo-600">
                            {suggestedDeparture ?? "--:--"}
                        </p>
                    </div>

                    <div className="rounded-2xl bg-white/80 p-4">
                        <p className="text-sm text-slate-500">Feels like</p>
                        <p className="mt-1 text-3xl font-bold text-indigo-600">
                            {typeof weather?.feels_like === "number"
                                ? `${Math.round(weather.feels_like)}°C`
                                : "--"}
                        </p>
                    </div>

                    <div className="rounded-2xl bg-white/80 p-4">
                        <p className="text-sm text-slate-500">Wind</p>
                        <p className="mt-1 text-3xl font-bold text-indigo-600">
                            {typeof weather?.wind_speed === "number"
                                ? `${Math.round(weather.wind_speed)} km/h`
                                : "--"}
                        </p>
                    </div>
                </div>
            </div>
        </section>
    );
}

function StatCard({
    icon,
    title,
    value,
}: {
    icon: string;
    title: string;
    value: string;
}) {
    return (
        <div className="rounded-2xl bg-white/80 p-5">
            <p className="text-2xl">{icon}</p>
            <p className="mt-3 text-sm text-slate-500">{title}</p>
            <p className="mt-1 text-2xl font-bold">{value}</p>
        </div>
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

function getSuggestedDeparture(
    arrivalTime: string,
    driveMinutes: number | null
): string | null {
    if (!driveMinutes) {
        return null;
    }

    const [hours, minutes] = arrivalTime.split(":").map(Number);
    if (Number.isNaN(hours) || Number.isNaN(minutes)) {
        return null;
    }

    const totalMinutes = hours * 60 + minutes - driveMinutes;
    const normalizedMinutes = ((totalMinutes % (24 * 60)) + (24 * 60)) % (24 * 60);
    const outputHours = Math.floor(normalizedMinutes / 60);
    const outputMinutes = normalizedMinutes % 60;

    return formatTime(`${String(outputHours).padStart(2, "0")}:${String(outputMinutes).padStart(2, "0")}`);
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

function getRouteLabel(recommendation: string | null | undefined): string {
    const normalized = recommendation?.toLowerCase() ?? "";

    if (normalized.includes("public transport") || normalized.includes("transit")) {
        return "Public transport";
    }

    if (normalized.includes("car") || normalized.includes("drive")) {
        return "Driving";
    }

    return "Best available route";
}
