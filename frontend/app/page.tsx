import Hero from "./components/Hero";
import CommuteForm from "./components/CommuteForm";
import RecommendationCard from "./components/RecommendationCard";
import InfoCards from "./components/InfoCards";

export default function Home() {
  return (
      <main className="min-h-screen bg-gradient-to-br from-sky-100 via-indigo-100 to-orange-100 px-4 py-6 text-slate-900">
        <section className="mx-auto flex max-w-6xl flex-col gap-6">
          <Hero />

          <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
            <CommuteForm />
            <RecommendationCard />
          </div>

          <InfoCards />
        </section>
      </main>
  );
}