import type { Metadata } from "next";
import { Hero } from "@/app/_components/hero";
import { HowItWorks } from "@/app/_components/how-it-works";
import { RecentAnalyses } from "@/app/_components/recent-analyses";

export const metadata: Metadata = {
  title: "Deppulse - Open Source Maintenance Checker",
  description:
    "Analyze GitHub repositories and get a clear maintenance status - Active, Stable, At-Risk, or Abandoned. Paste a repo URL, get an answer in seconds.",
  alternates: {
    canonical: "/",
  },
};

export default async function Home() {
  return (
    <main className="space-y-8 py-6">
      <Hero />
      <RecentAnalyses />
      <HowItWorks />
    </main>
  );
}
