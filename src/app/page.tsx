import Link from "next/link";
import { SearchForm } from "@/components/search-form";
import { getRecentAssessments } from "@/lib/data";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function Home() {
  const recentAssessments = await getRecentAssessments(10);

  return (
    <main className="container max-w-5xl mx-auto py-16 px-4 space-y-16">
      <div className="flex flex-col items-center text-center space-y-4">
        <h1 className="text-4xl font-extrabold tracking-tight lg:text-6xl">
          Deppulse
        </h1>
        <p className="text-xl text-muted-foreground max-w-[600px]">
          Quickly assess whether an open-source project is actively maintained.
        </p>
        <div className="w-full pt-6 flex justify-center">
          <SearchForm />
        </div>
      </div>

      {recentAssessments.length > 0 && (
        <section className="space-y-6">
          <h2 className="text-2xl font-semibold tracking-tight">
            Recent Analyses
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recentAssessments.map((assessment) => (
              <Link
                key={assessment.id}
                href={`/repo/${assessment.owner}/${assessment.repo}`}
                className="block group"
              >
                <Card className="h-full transition-all hover:bg-muted/50 hover:shadow-sm">
                  <CardHeader>
                    <div className="flex items-center justify-between gap-2">
                      <CardTitle className="text-lg truncate">
                        {assessment.fullName}
                      </CardTitle>
                      <Badge
                        variant={
                          assessment.riskCategory === "HIGH"
                            ? "destructive"
                            : assessment.riskCategory === "MODERATE"
                              ? "secondary"
                              : assessment.riskCategory === "LOW"
                                ? "default"
                                : "outline"
                        }
                      >
                        {assessment.riskCategory}
                      </Badge>
                    </div>
                  </CardHeader>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
