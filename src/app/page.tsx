import Link from "next/link";
import { SearchForm } from "@/components/search-form";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { getRecentAssessments } from "@/lib/data";

export default async function Home() {
  const recentAssessments = await getRecentAssessments(10);

  return (
    <main className="container max-w-5xl mx-auto py-8 px-4 space-y-8">
      <div className="flex flex-col items-center text-center space-y-4">
        <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl">
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
                <Card className="h-full transition-all hover:bg-muted/50">
                  <CardContent>
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-base truncate">
                        {assessment.fullName}
                      </div>
                      <Badge variant="secondary" className="capitalize">
                        {assessment.riskCategory}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
