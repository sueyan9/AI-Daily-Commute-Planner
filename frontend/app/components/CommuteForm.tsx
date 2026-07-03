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
        <section className="border-b border-[var(--line)] p-6 md:p-8 lg:min-h-full lg:border-r lg:border-b-0">
            <div>
                <p className="ui-label">Commute setup</p>
                <h1 className="mt-3 text-[2rem] font-semibold tracking-[-0.04em] text-[var(--foreground)]">
                    Plan today&apos;s commute
                </h1>
                <p className="mt-3 max-w-xs text-[15px] leading-7 text-[var(--muted)]">
                    Start with your live location, pick the destination, then let the
                    planner tell you when to leave.
                </p>
            </div>

            <div className="mt-10 space-y-6">
                <Field
                    label="Current location"
                    value={currentLocation}
                    readOnly
                    helperText="Live browser location"
                />
                <Field
                    label="Destination"
                    value={destination}
                    onChange={onDestinationChange}
                />
                <Field
                    label="Arrive by"
                    value={arrivalTime}
                    type="time"
                    onChange={onArrivalTimeChange}
                />

                <label className="block">
                    <p className="ui-label">Preference</p>
                    <select
                        value={preference}
                        onChange={(event) => onPreferenceChange(event.target.value)}
                        className="mt-3 h-14 w-full rounded-2xl border border-[var(--line)] bg-[var(--panel-strong)] px-4 text-[15px] font-medium text-[var(--foreground)] outline-none transition focus:border-[var(--accent)]"
                    >
                        <option>Fewer transfers</option>
                        <option>Fastest route</option>
                        <option>Less walking</option>
                    </select>
                </label>

                {locationError && (
                    <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                        {locationError}
                    </div>
                )}

                <button
                    onClick={onPlan}
                    disabled={isLoading}
                    className="mt-4 h-14 w-full rounded-2xl bg-[var(--foreground)] px-4 text-[15px] font-medium text-white transition hover:bg-[#2c2c42] disabled:cursor-not-allowed disabled:bg-[#a7a9b8]"
                >
                    {isLoading ? "Analyzing..." : "Plan my commute"}
                </button>
            </div>
        </section>
    );
}

function Field({
                   label,
                   value,
                   type = "text",
                   readOnly = false,
                   helperText,
                   onChange,
               }: {
    label: string;
    value: string;
    type?: "text" | "time";
    readOnly?: boolean;
    helperText?: string;
    onChange?: (value: string) => void;
}) {
    return (
        <label className="block">
            <p className="ui-label">{label}</p>
            <input
                type={type}
                value={value}
                readOnly={readOnly}
                onChange={(event) => onChange?.(event.target.value)}
                className="mt-3 h-14 w-full rounded-2xl border border-[var(--line)] bg-[var(--panel-strong)] px-4 text-[15px] font-medium text-[var(--foreground)] outline-none transition focus:border-[var(--accent)] read-only:text-[#404255]"
            />
            {helperText && (
                <p className="mt-2 text-xs text-[var(--muted)]">{helperText}</p>
            )}
        </label>
    );
}
