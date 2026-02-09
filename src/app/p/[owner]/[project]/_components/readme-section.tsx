import { Container } from "@/components/container";
import type { AnalysisRun } from "@/lib/domain/assessment";
import { ReadmeContent } from "./readme-content";

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
