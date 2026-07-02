type Props = {
    onPlan: () => void;
};

export default function CommuteForm({ onPlan }: Props) {
    return (
        <section className="rounded-[28px] bg-white/65 p-5 shadow-xl backdrop-blur">
            <div>
                <p className="text-sm font-medium text-indigo-500">Commute setup</p>
                <h2 className="mt-1 text-2xl font-bold">Plan your route</h2>
            </div>

            <div className="mt-6 space-y-4">
                <Field label="From" icon="📍" value="Auckland CBD" />
                <Field label="To" icon="🏁" value="Albany" />
                <Field label="Leave time" icon="🕒" value="5:30 PM" />

                <label className="block rounded-2xl bg-white/75 px-4 py-3 shadow-sm">
                    <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-50">
              🚶
            </span>

                        <div className="flex-1">
                            <p className="text-xs font-medium text-slate-500">Preference</p>
                            <select className="mt-1 w-full bg-transparent text-base font-semibold text-slate-900 outline-none">
                                <option>Fewer transfers</option>
                                <option>Fastest route</option>
                                <option>Less walking</option>
                            </select>
                        </div>
                    </div>
                </label>

                <button
                    onClick={onPlan}
                    className="mt-2 w-full rounded-2xl bg-indigo-500 px-4 py-4 font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:bg-indigo-600"
                >
                    Refresh Analysis
                </button>
            </div>
        </section>
    );
}

function Field({
                   label,
                   icon,
                   value,
               }: {
    label: string;
    icon: string;
    value: string;
}) {
    return (
        <label className="block rounded-2xl bg-white/75 px-4 py-3 shadow-sm">
            <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-50">
          {icon}
        </span>

                <div className="flex-1">
                    <p className="text-xs font-medium text-slate-500">{label}</p>
                    <input
                        defaultValue={value}
                        className="mt-1 w-full bg-transparent text-base font-semibold text-slate-900 outline-none"
                    />
                </div>
            </div>
        </label>
    );
}