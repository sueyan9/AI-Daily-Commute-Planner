export default function CommuteForm() {
    return (
        <section className="rounded-[28px] bg-white/65 p-5 shadow-xl backdrop-blur">
            <h2 className="text-xl font-semibold">Plan your commute</h2>

            <div className="mt-5 space-y-4">
                <input
                    className="w-full rounded-2xl border border-white/70 bg-white/70 px-4 py-3 outline-none"
                    placeholder="From: Auckland CBD"
                />
                <input
                    className="w-full rounded-2xl border border-white/70 bg-white/70 px-4 py-3 outline-none"
                    placeholder="To: Albany"
                />
                <input
                    className="w-full rounded-2xl border border-white/70 bg-white/70 px-4 py-3 outline-none"
                    placeholder="Leave time: 5:30 PM"
                />
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
    );
}