export default function Hero() {
    return (
        <header className="relative overflow-hidden rounded-[32px] bg-white/60 p-6 shadow-xl backdrop-blur md:p-8">
            <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-indigo-300/30 blur-3xl" />
            <div className="absolute -bottom-20 left-20 h-56 w-56 rounded-full bg-orange-200/40 blur-3xl" />

            <div className="relative grid gap-8 md:grid-cols-[1.4fr_0.8fr] md:items-center">
                <div>
                    <p className="text-sm font-medium text-slate-500">Good morning, Master 👋</p>

                    <h1 className="mt-3 max-w-xl text-5xl font-bold leading-tight tracking-tight text-slate-950 md:text-6xl">
                        AI Daily
                        <br />
                        Commute Planner
                    </h1>

                    <p className="mt-4 max-w-lg text-base leading-7 text-slate-600">
                        Check traffic, weather and public transport before you leave.
                    </p>

                    <div className="mt-6 flex flex-wrap gap-3 text-sm">
            <span className="rounded-full bg-white/70 px-4 py-2 text-slate-600 shadow-sm">
              🚗 Traffic
            </span>
                        <span className="rounded-full bg-white/70 px-4 py-2 text-slate-600 shadow-sm">
              🌦 Weather
            </span>
                        <span className="rounded-full bg-white/70 px-4 py-2 text-slate-600 shadow-sm">
              🚌 Transit
            </span>
                    </div>
                </div>

                <div className="rounded-[28px] bg-white/70 p-5 shadow-lg backdrop-blur">
                    <p className="text-sm font-medium text-slate-500">Recommended departure</p>

                    <div className="mt-3 flex items-end gap-2">
            <span className="text-5xl font-bold tracking-tight text-indigo-600">
              5:25
            </span>
                        <span className="pb-2 text-lg font-semibold text-indigo-500">PM</span>
                    </div>

                    <div className="mt-5 grid grid-cols-2 gap-3">
                        <div className="rounded-2xl bg-white/80 p-4">
                            <p className="text-xs text-slate-500">Weather</p>
                            <p className="mt-1 font-semibold text-slate-900">21°C Rain</p>
                        </div>

                        <div className="rounded-2xl bg-white/80 p-4">
                            <p className="text-xs text-slate-500">Arrival</p>
                            <p className="mt-1 font-semibold text-slate-900">6:25 PM</p>
                        </div>
                    </div>

                    <div className="mt-4 rounded-2xl bg-indigo-50/80 p-4">
                        <p className="text-sm font-medium text-indigo-700">
                            NX1 is the safest option today.
                        </p>
                    </div>
                </div>
            </div>
        </header>
    );
}