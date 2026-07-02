export default function RecommendationCard() {
    return (
        <section className="rounded-[30px] bg-white/65 p-6 shadow-xl backdrop-blur">

            {/* Header */}

            <div className="flex items-start justify-between">

                <div>

                    <p className="text-sm font-medium text-indigo-500">
                        ✨ Today's Best Route
                    </p>

                    <h2 className="mt-2 text-4xl font-bold">
                        NX1 Express
                    </h2>

                    <p className="mt-1 text-slate-500">
                        Britomart → Albany Station
                    </p>

                </div>

                <div className="rounded-2xl bg-indigo-50 px-4 py-3">

                    <p className="text-xs text-slate-500">
                        Confidence
                    </p>

                    <p className="mt-1 text-xl font-bold text-indigo-600">
                        98%
                    </p>

                </div>

            </div>

            {/* Stats */}

            <div className="mt-8 grid gap-4 md:grid-cols-3">

                <StatCard
                    icon="⏱"
                    title="Travel Time"
                    value="55 mins"
                />

                <StatCard
                    icon="🚌"
                    title="Transfers"
                    value="0"
                />

                <StatCard
                    icon="🚦"
                    title="Traffic"
                    value="On Time"
                />

            </div>

            {/* AI Summary */}

            <div className="mt-8 rounded-3xl bg-gradient-to-r from-indigo-50 to-sky-50 p-6">

                <div className="flex items-center gap-2">

          <span className="text-xl">
            🤖
          </span>

                    <h3 className="font-semibold text-slate-900">
                        AI Recommendation
                    </h3>

                </div>

                <p className="mt-4 leading-7 text-slate-600">

                    Heavy traffic has been detected on SH1.

                    Taking the NX1 Express avoids congestion
                    and is expected to save approximately
                    <span className="font-semibold text-slate-900">
            {" "}12 minutes{" "}
          </span>

                    compared with driving.

                </p>

                <div className="mt-5 rounded-2xl bg-white/80 p-4">

                    <p className="text-sm text-slate-500">

                        Suggested Departure

                    </p>

                    <p className="mt-1 text-3xl font-bold text-indigo-600">

                        5:25 PM

                    </p>

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

    icon: string

    title: string

    value: string

}) {

    return (

        <div className="rounded-2xl bg-white/80 p-5">

            <p className="text-2xl">
                {icon}
            </p>

            <p className="mt-3 text-sm text-slate-500">
                {title}
            </p>

            <p className="mt-1 text-2xl font-bold">
                {value}
            </p>

        </div>

    )

}