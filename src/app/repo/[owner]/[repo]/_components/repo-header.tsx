import { formatDistanceToNow } from "date-fns";
import {
  Calendar,
  Clock,
  Code2,
  ExternalLink,
  GitFork,
  Scale,
  Star,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { Assessment } from "@/db/schema";
import { formatNumber } from "@/lib/utils";
import { RepoContainer } from "./repo-container";

export function RepoHeader({ assessment }: { assessment: Assessment }) {
  const stats = [
    { icon: Star, value: formatNumber(assessment.stars ?? 0), label: "Stars" },
    {
      icon: GitFork,
      value: formatNumber(assessment.forks ?? 0),
      label: "Forks",
    },
    { icon: Scale, value: assessment.license, label: "License" },
    { icon: Code2, value: assessment.language, label: "Language" },
  ].filter((s) => s.value);

  return (
    <section className="bg-surface-2">
      <RepoContainer className="py-6">
        <div className="flex gap-4 justify-between">
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                {assessment.fullName}
              </h1>
            </div>

            {assessment.description && (
              <p className="text-base text-muted-foreground leading-relaxed">
                {assessment.description}
              </p>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center gap-4 pt-2">
              {assessment.htmlUrl && (
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                  className="h-8 gap-1.5 text-muted-foreground hover:text-foreground"
                >
                  <a
                    href={assessment.htmlUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    GitHub
                    <ExternalLink className="size-3 opacity-70" />
                  </a>
                </Button>
              )}
              <Separator
                orientation="vertical"
                className="data-[orientation=vertical]:h-4"
              />
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2.5 text-sm text-muted-foreground">
                {stats.map((stat) => (
                  <div
                    key={stat.label}
                    className="flex items-center gap-1.5"
                    title={stat.label}
                  >
                    <stat.icon className="size-4 opacity-70" />
                    <span className="font-medium text-foreground/80">
                      {stat.value}
                    </span>
                  </div>
                ))}
                {assessment.repositoryCreatedAt && (
                  <div className="flex items-center gap-1.5" title="Created">
                    <Calendar className="size-4 opacity-70" />
                    <span className="font-medium text-foreground/80">
                      {formatDistanceToNow(
                        new Date(assessment.repositoryCreatedAt),
                      )}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-end">
            <Card>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between gap-6">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">
                      Risk Assessment
                    </p>
                    <p className="text-base font-medium text-foreground">
                      Score: {assessment.riskScore ?? 0}/100
                    </p>
                  </div>
                  <Badge
                    variant="secondary"
                    className="capitalize text-sm px-2.5 py-0.5"
                  >
                    {assessment.riskCategory}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground pt-3 border-t border-border/50">
                  <Clock className="size-3 opacity-70" />
                  <span>
                    Analyzed: {new Date(assessment.analyzedAt).toLocaleString()}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </RepoContainer>
    </section>
  );
}
