import dynamic from "next/dynamic";
import { Container } from "@/components/container";
import type { AnalysisRun } from "@/lib/domain/assessment";

const ReadmeContent = dynamic(
  () =>
    import("./readme-content").then((mod) => ({
      default: mod.ReadmeContent,
    })),
  {
    loading: () => (
      <div className="rounded-lg border border-border bg-surface-2/50 h-[400px] animate-pulse" />
    ),
  },
);

interface ReadmeSectionProps {
  run: AnalysisRun;
}

export function ReadmeSection({ run }: ReadmeSectionProps) {
  const readmeContent = run.metrics?.readmeContent;

  if (!readmeContent) return null;

  return (
    <Container>
      <section className="space-y-4 animate-in fade-in duration-300 delay-200 fill-mode-backwards">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          README
        </h2>
        <ReadmeContent content={readmeContent} />
      </section>
    </Container>
  );
}
