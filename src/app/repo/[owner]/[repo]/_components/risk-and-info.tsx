import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { Assessment } from "@/db/schema";
import { formatNumber } from "@/lib/utils";
import { RepoContainer } from "./repo-container";

export function RiskAndInfoSection({ assessment }: { assessment: Assessment }) {
  const generalInfo = [
    { title: "Stars", value: formatNumber(assessment.stars ?? 0) },
    { title: "Forks", value: formatNumber(assessment.forks ?? 0) },
    { title: "Language", value: assessment.language ?? "N/A" },
    { title: "License", value: assessment.license ?? "N/A" },
  ];

  return (
    <RepoContainer>
      <div className="flex flex-col md:flex-row gap-4 justify-between">
        <div className="space-y-3">
          <h2 className="sr-only">Repository Info</h2>
          <div className="flex gap-x-2 sm:gap-x-4 text-sm">
            {generalInfo.map((info) => (
              <div key={info.title}>
                <span className="text-muted-foreground">{info.title}</span>
                <p className="font-medium">{info.value}</p>
              </div>
            ))}
          </div>
        </div>
        <Card>
          <CardContent>
            <div className="flex items-center justify-between gap-5">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                  Risk Assessment
                </p>
                <p className="text-sm text-muted-foreground">
                  Score: {assessment.riskScore ?? 0}/100 (lower is better)
                </p>
              </div>
              <Badge variant="secondary" className="capitalize text-sm">
                {assessment.riskCategory}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </RepoContainer>
  );
}
