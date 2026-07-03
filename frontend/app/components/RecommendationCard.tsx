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
};

export default function RecommendationCard({
    result,
    isLoading,
    error,
}: Props) {
    const driveMinutes = getDriveMinutes(result?.driving_route?.duration);
    const driveDistance = result?.driving_route?.distance_meters;
    const weather = result?.weather;

    return (
        <section className="rounded-[30px] bg-white/65 p-6 shadow-xl backdrop-blur">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <p className="text-sm font-medium text-indigo-500">AI commute summary</p>
                    <h2 className="mt-2 text-4xl font-bold">Drive overview</h2>
                    <p className="mt-1 text-slate-500">
                        {result?.destination ?? "Waiting for route analysis"}
                    </p>
                </div>

                <div className="rounded-2xl bg-indigo-50 px-4 py-3">
                    <p className="text-xs text-slate-500">Status</p>
                    <p className="mt-1 text-xl font-bold text-indigo-600">
                        {isLoading ? "Loading" : result ? "Ready" : "Idle"}
                    </p>
                </div>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-3">
                <StatCard
                    icon="⏱"
                    title="Drive Time"
                    value={driveMinutes ? `${driveMinutes} min` : "--"}
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
                    <h3 className="font-semibold text-slate-900">AI Recommendation</h3>
                </div>

                <p className="mt-4 min-h-24 leading-7 text-slate-600">
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

                <div className="mt-5 grid gap-3 md:grid-cols-2">
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
