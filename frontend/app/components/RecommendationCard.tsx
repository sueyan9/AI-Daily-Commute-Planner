export default function RecommendationCard() {
    return (
        <section className="rounded-[28px] bg-white/65 p-6 shadow-xl backdrop-blur">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm text-indigo-500">Recommended route</p>
                    <h2 className="mt-1 text-3xl font-bold">NX1 Express</h2>
                    <p className="mt-1 text-slate-500">Britomart → Albany Station</p>
                </div>
                <span className="rounded-full bg-indigo-100 px-4 py-2 text-sm font-semibold text-indigo-600">
          Best choice
        </span>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl bg-white/70 p-4">
                    <p className="text-sm text-slate-500">Travel time</p>
                    <p className="mt-2 text-2xl font-bold text-indigo-600">55 min</p>
                </div>
                <div className="rounded-2xl bg-white/70 p-4">
                    <p className="text-sm text-slate-500">Arrive at</p>
                    <p className="mt-2 text-2xl font-bold text-indigo-600">6:25 PM</p>
                </div>
                <div className="rounded-2xl bg-white/70 p-4">
                    <p className="text-sm text-slate-500">Transfers</p>
                    <p className="mt-2 text-2xl font-bold text-indigo-600">0</p>
                </div>
            </div>

            <div className="mt-6 rounded-2xl bg-emerald-50/80 p-4">
                <p className="font-semibold text-emerald-700">Recommendation reason</p>
                <p className="mt-2 text-sm text-slate-600">
                    SH1 northbound traffic is heavy. NX1 is more reliable than driving and avoids transfers.
                </p>
            </div>
        </section>
    );
}