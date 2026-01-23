import type { Metadata } from "next";
import { Suspense } from "react";
import { Hero } from "@/app/_components/hero";
import { HowItWorks } from "@/app/_components/how-it-works";
import { RecentAnalyses } from "@/app/_components/recent-analyses";

export const metadata: Metadata = {
  title: "Deppulse - Open Source Maintenance Checker",
  description:
    "Analyze GitHub repositories and get a clear maintenance status - Healthy, Moderate, Declining, or Inactive. Paste a repo URL, get an answer in seconds.",
  alternates: {
    canonical: "/",
  },
};

export default function Home() {
  return (
    <main className="space-y-8 py-6">
      <Hero />
      <Suspense fallback={<RecentAnalysesSkeleton />}>
        <RecentAnalyses />
      </Suspense>
      <HowItWorks />
    </main>
  );
}

function RecentAnalysesSkeleton() {
  return (
    <section className="bg-surface-2 animate-pulse">
      <div className="container mx-auto px-4 py-8 space-y-4">
        <div className="h-7 w-40 bg-muted rounded" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-24 bg-muted rounded-lg" />
          ))}
        </div>
      </div>
    </section>
  );
}
