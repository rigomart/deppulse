"use client";

import { Code2, ExternalLink, GitFork, Scale, Star } from "lucide-react";
import Image from "next/image";
import { Container } from "@/components/container";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { computeScoreFromMetrics } from "@/core/maintenance";
import { categoryColors } from "@/lib/category-styles";
import type { AnalysisRun } from "@/lib/domain/assessment";
import { formatNumber } from "@/lib/utils";

interface CompareHeaderProps {
  runA: AnalysisRun;
  runB: AnalysisRun;
}

function ProjectCard({ run }: { run: AnalysisRun }) {
  const metrics = run.metrics;
  const result = metrics ? computeScoreFromMetrics(metrics) : null;

  const stats = [
    {
      icon: Star,
      value: formatNumber(metrics?.stars ?? 0),
      label: "Stars",
    },
    {
      icon: GitFork,
      value: formatNumber(metrics?.forks ?? 0),
      label: "Forks",
    },
    { icon: Scale, value: metrics?.license, label: "License" },
    { icon: Code2, value: metrics?.language, label: "Language" },
  ].filter((s) => s.value);

  return (
    <Card className="flex-1 min-w-0">
      <CardContent className="space-y-3">
        <div className="flex items-center gap-3 min-w-0">
          {metrics?.avatarUrl && (
            <Image
              src={metrics.avatarUrl}
              alt={`${run.repository.owner} avatar`}
              width={32}
              height={32}
              className="rounded-full shrink-0"
            />
          )}
          {metrics?.htmlUrl ? (
            <a
              href={metrics.htmlUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-1.5 font-bold tracking-tight truncate hover:underline text-lg"
            >
              <span className="truncate">{run.repository.fullName}</span>
              <ExternalLink className="size-3.5 opacity-0 transition-opacity group-hover:opacity-70 shrink-0" />
            </a>
          ) : (
            <p className="font-bold tracking-tight truncate text-lg">
              {run.repository.fullName}
            </p>
          )}
        </div>

        {metrics?.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {metrics.description}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="flex items-center gap-1"
              title={stat.label}
            >
              <stat.icon className="size-3.5 opacity-70" />
              <span className="font-medium text-foreground/80">
                {stat.value}
              </span>
            </div>
          ))}
        </div>

        {result && (
          <>
            <Separator />
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <p className="text-xs text-muted-foreground">
                  Maintenance Score
                </p>
                <p className="text-xl font-semibold">{result.score}/100</p>
              </div>
              <Badge
                className={`capitalize text-sm border ${categoryColors[result.category]}`}
              >
                {result.category}
              </Badge>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export function CompareHeader({ runA, runB }: CompareHeaderProps) {
  return (
    <Container>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <ProjectCard run={runA} />
        <ProjectCard run={runB} />
      </div>
    </Container>
  );
}
