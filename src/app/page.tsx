import type { Metadata } from "next";
import { Suspense } from "react";
import { Hero } from "@/app/_components/hero";
import { HowItWorks } from "@/app/_components/how-it-works";
import { RecentAnalyses } from "@/app/_components/recent-analyses";
import { Container } from "@/components/container";
import { Card, CardContent } from "@/components/ui/card";

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
    <section className="bg-surface-2">
      <Container className="py-8 space-y-4">
        <div className="h-7 w-40 bg-muted animate-pulse rounded" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="h-full">
              <CardContent className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="h-6 w-6 rounded-full bg-muted animate-pulse shrink-0" />
                    <div className="h-4 w-32 bg-muted animate-pulse rounded" />
                  </div>
                  <div className="h-5 w-16 bg-muted animate-pulse rounded-full" />
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-3.5 w-12 bg-muted animate-pulse rounded" />
                  <div className="h-3.5 w-16 bg-muted animate-pulse rounded" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </Container>
    </section>
  );
}
