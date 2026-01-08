import { formatDistanceToNow } from "date-fns";
import {
  Calendar,
  Code2,
  ExternalLink,
  GitFork,
  Scale,
  Star,
} from "lucide-react";
import Image from "next/image";
import type { ReactNode } from "react";
import { Container } from "@/components/container";
import type { Assessment } from "@/db/schema";
import { formatNumber } from "@/lib/utils";

interface ProjectHeaderProps {
  assessment: Assessment;
  scoreSlot: ReactNode;
}

export function ProjectHeader({ assessment, scoreSlot }: ProjectHeaderProps) {
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
      <Container className="py-6">
        <div className="flex flex-col sm:flex-row gap-4 justify-between animate-in fade-in slide-in-from-bottom-1 duration-300">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              {assessment.avatarUrl && (
                <Image
                  src={assessment.avatarUrl}
                  alt={`${assessment.owner} avatar`}
                  width={40}
                  height={40}
                  className="rounded-full"
                />
              )}
              {assessment.htmlUrl ? (
                <a
                  href={assessment.htmlUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center gap-2 text-2xl sm:text-3xl font-bold tracking-tight hover:underline"
                >
                  <span>{assessment.fullName}</span>
                  <ExternalLink className="size-4 opacity-0 transition-opacity group-hover:opacity-70" />
                </a>
              ) : (
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                  {assessment.fullName}
                </h1>
              )}
            </div>

            {assessment.description && (
              <p className="text-base text-muted-foreground leading-relaxed">
                {assessment.description}
              </p>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center gap-4 pt-2">
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

          <div className="flex items-start">{scoreSlot}</div>
        </div>
      </Container>
    </section>
  );
}
