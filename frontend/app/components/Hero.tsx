export default function Hero() {
    return (
        <header className="rounded-[28px] bg-white/60 p-6 shadow-xl backdrop-blur">
            <p className="text-sm text-slate-500">Good morning 👋</p>
            <h1 className="mt-2 text-4xl font-bold tracking-tight">
                AI Daily Commute Planner
            </h1>
            <p className="mt-3 text-slate-600">
                Plan the best way to leave home based on traffic, weather and public transport.
            </p>
        </header>
    );
}