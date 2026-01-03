import { formatDistanceToNow } from "date-fns";
import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Assessment } from "@/db/schema";
import { RepoContainer } from "./repo-container";

export function RepoHeader({ assessment }: { assessment: Assessment }) {
  return (
    <section className="bg-surface-2">
      <RepoContainer className="py-6">
        <div className="flex flex-col sm:flex-row sm:justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              {assessment.fullName}
            </h1>
            {assessment.description && (
              <p className="text-base sm:text-lg text-muted-foreground max-w-2xl">
                {assessment.description}
              </p>
            )}
          </div>

          <div className="flex flex-col items-start sm:items-end gap-2">
            {assessment.htmlUrl && (
              <Button variant="outline" size="sm" asChild>
                <a
                  href={assessment.htmlUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  GitHub
                  <ExternalLink className="size-3 ml-2" />
                </a>
              </Button>
            )}
            {assessment.repositoryCreatedAt && (
              <div className="text-sm text-muted-foreground">
                Created{" "}
                {formatDistanceToNow(new Date(assessment.repositoryCreatedAt), {
                  addSuffix: true,
                })}
              </div>
            )}
          </div>
        </div>
      </RepoContainer>
    </section>
  );
}
