import { Star } from "lucide-react";
import Link from "next/link";
import { Container } from "@/components/container";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { getRecentAssessments } from "@/lib/data";
import { formatNumber } from "@/lib/utils";

export async function RecentAnalyses() {
  const recentAssessments = await getRecentAssessments(12);

  if (recentAssessments.length === 0) {
    return null;
  }

  return (
    <section className="bg-surface-2">
      <Container className="py-8 space-y-4">
        <h2 className="text-xl font-semibold tracking-tight">
          Recent Analyses
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {recentAssessments.map((assessment) => (
            <Link
              key={assessment.id}
              href={`/repo/${assessment.owner}/${assessment.repo}`}
            >
              <Card className="h-full transition-all hover:bg-surface-3">
                <CardContent className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-base font-medium truncate">
                      {assessment.fullName}
                    </div>
                    <Badge variant="secondary" className="capitalize shrink-0">
                      {assessment.riskCategory}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Star className="w-3.5 h-3.5" />
                      {formatNumber(assessment.stars ?? 0)}
                    </span>
                    {assessment.language && <span>{assessment.language}</span>}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </Container>
    </section>
  );
}
