export default function Home() {
  return (
      <main className="min-h-screen bg-gradient-to-br from-sky-100 via-indigo-100 to-orange-100 px-4 py-6 text-slate-900">
        <section className="mx-auto flex max-w-6xl flex-col gap-6">
          <header className="rounded-[28px] bg-white/60 p-6 shadow-xl backdrop-blur">
            <p className="text-sm text-slate-500">Good morning 👋</p>
            <h1 className="mt-2 text-4xl font-bold tracking-tight">
              AI Daily Commute Planner
            </h1>
            <p className="mt-3 text-slate-600">
              Plan the best way to leave home based on traffic, weather and public transport.
            </p>
          </header>

          <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
            <section className="rounded-[28px] bg-white/65 p-5 shadow-xl backdrop-blur">
              <h2 className="text-xl font-semibold">Plan your commute</h2>

              <div className="mt-5 space-y-4">
                <input className="w-full rounded-2xl border border-white/70 bg-white/70 px-4 py-3 outline-none" placeholder="From: Auckland CBD" />
                <input className="w-full rounded-2xl border border-white/70 bg-white/70 px-4 py-3 outline-none" placeholder="To: Albany" />
                <input className="w-full rounded-2xl border border-white/70 bg-white/70 px-4 py-3 outline-none" placeholder="Leave time: 5:30 PM" />
                <select className="w-full rounded-2xl border border-white/70 bg-white/70 px-4 py-3 outline-none">
                  <option>Fewer transfers</option>
                  <option>Fastest route</option>
                  <option>Less walking</option>
                </select>

                <button className="w-full rounded-2xl bg-indigo-500 px-4 py-3 font-semibold text-white shadow-lg">
                  Plan My Commute
                </button>
              </div>
            </section>

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
          </div>

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
        </section>
      </main>
  );
}