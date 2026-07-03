type Props = {
    currentLocation: string;
    destination: string;
    arrivalTime: string;
    preference: string;
    onDestinationChange: (value: string) => void;
    onArrivalTimeChange: (value: string) => void;
    onPreferenceChange: (value: string) => void;
    onPlan: () => void;
    isLoading: boolean;
    locationError: string;
};

export default function CommuteForm({
    currentLocation,
    destination,
    arrivalTime,
    preference,
    onDestinationChange,
    onArrivalTimeChange,
    onPreferenceChange,
    onPlan,
    isLoading,
    locationError,
}: Props) {
    return (
        <section className="rounded-[28px] bg-white/68 p-5 shadow-xl shadow-slate-200/70 backdrop-blur md:p-6">
            <div>
                <p className="text-sm font-medium text-indigo-500">Commute setup</p>
                <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">
                    Plan today&apos;s commute
                </h1>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                    Start with your live location, pick the destination, then let the
                    planner tell you when to leave.
                </p>
            </div>

            <div className="mt-6 space-y-4">
                <Field
                    label="Current location"
                    icon="📍"
                    value={currentLocation}
                    readOnly
                    helperText="Live browser location"
                />
                <Field
                    label="Destination"
                    icon="🏁"
                    value={destination}
                    onChange={onDestinationChange}
                />
                <Field
                    label="Arrive by"
                    icon="🕒"
                    value={arrivalTime}
                    type="time"
                    onChange={onArrivalTimeChange}
                />

                <label className="block rounded-2xl bg-white/75 px-4 py-3 shadow-sm">
                    <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-50">
                            🚶
                        </span>

                        <div className="flex-1">
                            <p className="text-xs font-medium text-slate-500">Preference</p>
                            <select
                                value={preference}
                                onChange={(event) => onPreferenceChange(event.target.value)}
                                className="mt-1 w-full bg-transparent text-base font-semibold text-slate-900 outline-none"
                            >
                                <option>Fewer transfers</option>
                                <option>Fastest route</option>
                                <option>Less walking</option>
                            </select>
                        </div>
                    </div>
                </label>

                {locationError && (
                    <div className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
                        {locationError}
                    </div>
                )}

                <button
                    onClick={onPlan}
                    disabled={isLoading}
                    className="mt-2 w-full rounded-2xl bg-indigo-500 px-4 py-4 font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:bg-indigo-600 disabled:cursor-not-allowed disabled:bg-indigo-300"
                >
                    {isLoading ? "Refreshing..." : "Refresh analysis"}
                </button>
            </div>
        </section>
    );
}

function Field({
                   label,
                   icon,
                   value,
                   type = "text",
                   readOnly = false,
                   helperText,
                   onChange,
               }: {
    label: string;
    icon: string;
    value: string;
    type?: "text" | "time";
    readOnly?: boolean;
    helperText?: string;
    onChange?: (value: string) => void;
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
                        type={type}
                        value={value}
                        readOnly={readOnly}
                        onChange={(event) => onChange?.(event.target.value)}
                        className="mt-1 w-full bg-transparent text-base font-semibold text-slate-900 outline-none read-only:text-slate-800"
                    />
                    {helperText && (
                        <p className="mt-1 text-xs text-slate-400">{helperText}</p>
                    )}
                </div>
            </div>
        </label>
    );
}
