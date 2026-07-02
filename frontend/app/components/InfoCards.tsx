export default function InfoCards() {
    return (
        <section className="grid gap-4 md:grid-cols-3">
            <div className="rounded-[24px] bg-white/65 p-5 shadow-lg backdrop-blur">
                <p className="text-sm text-slate-500">Traffic</p>
                <h3 className="mt-2 text-xl font-bold">Heavy congestion</h3>
                <p className="mt-2 text-sm text-slate-600">Estimated delay: 23 min</p>
            </div>

            <div className="rounded-[24px] bg-white/65 p-5 shadow-lg backdrop-blur">
                <p className="text-sm text-slate-500">Weather</p>
                <h3 className="mt-2 text-xl font-bold">21°C · Light rain</h3>
                <p className="mt-2 text-sm text-slate-600">Bring an umbrella.</p>
            </div>

            <div className="rounded-[24px] bg-white/65 p-5 shadow-lg backdrop-blur">
                <p className="text-sm text-slate-500">Final advice</p>
                <h3 className="mt-2 text-xl font-bold">Leave at 5:25 PM</h3>
                <p className="mt-2 text-sm text-slate-600">This should keep you on time.</p>
            </div>
        </section>
    );
}