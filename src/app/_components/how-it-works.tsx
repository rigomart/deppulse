import { Container } from "@/components/container";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import type { DimensionLevel } from "@/core/dimensions";
import { dimensionLevelColors } from "@/lib/category-styles";
import { cn } from "@/lib/utils";

const levelDescriptions: Record<DimensionLevel, string> = {
  strong: "All key signals are healthy",
  adequate: "Acceptable but not outstanding",
  weak: "Notable gaps or decline",
  inactive: "No meaningful activity",
};

function LevelBadge({ level }: { level: DimensionLevel }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium border capitalize",
        dimensionLevelColors[level],
      )}
    >
      {level}
    </span>
  );
}

export function HowItWorks() {
  return (
    <section className="bg-surface-2 animate-in fade-in duration-300 delay-300 fill-mode-backwards">
      <Container className="py-8 space-y-4">
        <h2 className="text-xl font-semibold tracking-tight">How It Works</h2>

        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="item-1">
            <AccordionTrigger>How is project health assessed?</AccordionTrigger>
            <AccordionContent>
              <div className="space-y-3 text-muted-foreground">
                <p>
                  Instead of a single score, each repository is assessed across
                  three independent <strong>health dimensions</strong>. Each
                  dimension is rated as strong, adequate, weak, or inactive
                  based on concrete signals from the GitHub API.
                </p>
                <p>
                  This gives a more nuanced view — a project can have strong
                  development activity but weak release cadence, and you'll see
                  both clearly.
                </p>
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="item-2">
            <AccordionTrigger>What are the three dimensions?</AccordionTrigger>
            <AccordionContent>
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-foreground mb-1">
                    Development Activity
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Is work happening? Measured by commits in the last 90 days,
                    merged pull requests, and days since the last commit.
                  </p>
                </div>
                <div>
                  <h4 className="font-medium text-foreground mb-1">
                    Issue Management
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Are problems being handled? Measured by percentage of open
                    issues, median resolution time, and recency of closed
                    issues.
                  </p>
                </div>
                <div>
                  <h4 className="font-medium text-foreground mb-1">
                    Release Cadence
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Are changes shipped deliberately? Measured by releases per
                    year, regularity, and days since the last release.
                  </p>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="item-3">
            <AccordionTrigger>What do the levels mean?</AccordionTrigger>
            <AccordionContent>
              <ul className="space-y-2 text-sm">
                {(["strong", "adequate", "weak", "inactive"] as const).map(
                  (level) => (
                    <li key={level} className="flex items-start gap-2">
                      <LevelBadge level={level} />
                      <span className="text-muted-foreground">
                        {levelDescriptions[level]}
                      </span>
                    </li>
                  ),
                )}
              </ul>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="item-4">
            <AccordionTrigger>What are red flags?</AccordionTrigger>
            <AccordionContent>
              <div className="space-y-3 text-muted-foreground">
                <p>
                  Red flags are concrete, binary risk callouts that fire when
                  something is objectively concerning. They are hidden entirely
                  when nothing is wrong.
                </p>
                <ul className="space-y-2 text-sm">
                  <li>
                    <strong className="text-foreground">
                      Archived repository
                    </strong>{" "}
                    — read-only, no further updates expected.
                  </li>
                  <li>
                    <strong className="text-foreground">
                      Extended inactivity
                    </strong>{" "}
                    — no commits, PRs, or releases in over 180 days.
                  </li>
                  <li>
                    <strong className="text-foreground">
                      Stale pull requests
                    </strong>{" "}
                    — open PRs with none merged recently.
                  </li>
                  <li>
                    <strong className="text-foreground">
                      No releases despite commits
                    </strong>{" "}
                    — active development but changes aren't shipped.
                  </li>
                  <li>
                    <strong className="text-foreground">
                      No issue tracker activity
                    </strong>{" "}
                    — active commits but no issue management.
                  </li>
                  <li>
                    <strong className="text-foreground">Never released</strong>{" "}
                    — active for over a year with no formal release.
                  </li>
                </ul>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </Container>
    </section>
  );
}
