import { Container } from "@/components/container";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { MAINTENANCE_CONFIG } from "@/core/maintenance";
import type { FreshnessStep } from "@/core/scoring/types";
import { categoryColors } from "@/lib/category-styles";

const {
  categoryThresholds,
  expectedActivityCriteria,
  freshnessMultipliers,
  hardCaps,
  quality,
} = MAINTENANCE_CONFIG;

function formatFreshnessRange(
  step: FreshnessStep,
  index: number,
  steps: readonly FreshnessStep[],
): string {
  if (Number.isFinite(step.maxDays)) {
    return `<=${step.maxDays}d`;
  }

  const previousFiniteStep = [...steps]
    .slice(0, index)
    .reverse()
    .find((candidate) => Number.isFinite(candidate.maxDays));

  return `${previousFiniteStep?.maxDays ?? 0}+d`;
}

function formatFreshnessTimeline(steps: readonly FreshnessStep[]): string {
  return steps
    .map((step, index, allSteps) => {
      if (!step) return null;

      const range = formatFreshnessRange(step, index, allSteps);
      return `${range} (${step.multiplier}x)`;
    })
    .filter((entry): entry is string => entry !== null)
    .join(", ");
}

const highExpectedHardCapText = [...hardCaps.high]
  .sort((a, b) => a.afterDays - b.afterDays)
  .map((cap) => `over ${cap.afterDays} days caps score at ${cap.maxScore}`)
  .join(", and ");

export function HowItWorks() {
  return (
    <section className="bg-surface-2 animate-in fade-in duration-300 delay-300 fill-mode-backwards">
      <Container className="py-8 space-y-4">
        <h2 className="text-xl font-semibold tracking-tight">How It Works</h2>

        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="item-1">
            <AccordionTrigger>How does scoring work?</AccordionTrigger>
            <AccordionContent>
              <div className="space-y-3">
                <p className="text-muted-foreground">
                  Repositories receive a maintenance score from 0-100 using
                  <strong> quality </strong>
                  and
                  <strong> freshness</strong>. Quality measures issue health,
                  release behavior, community size, project maturity, and
                  activity breadth. Freshness is a multiplier based on how
                  recent the latest commit, merged PR, or release is.
                </p>
                <p className="text-muted-foreground">
                  For repositories that are expected to be active, stale
                  activity also triggers hard score caps so old activity cannot
                  hide current risk.
                </p>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <Badge
                      className={`shrink-0 border ${categoryColors.healthy}`}
                    >
                      Healthy
                    </Badge>
                    <span className="text-muted-foreground">
                      {categoryThresholds.healthy}-100: actively maintained
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Badge
                      className={`shrink-0 border ${categoryColors.moderate}`}
                    >
                      Moderate
                    </Badge>
                    <span className="text-muted-foreground">
                      {categoryThresholds.moderate}-
                      {categoryThresholds.healthy - 1}: acceptable but monitor
                      updates
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Badge
                      className={`shrink-0 border ${categoryColors.declining}`}
                    >
                      Declining
                    </Badge>
                    <span className="text-muted-foreground">
                      {categoryThresholds.declining}-
                      {categoryThresholds.moderate - 1}: signs of maintenance
                      decline
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Badge
                      className={`shrink-0 border ${categoryColors.inactive}`}
                    >
                      Inactive
                    </Badge>
                    <span className="text-muted-foreground">
                      0-{categoryThresholds.declining - 1}: likely inactive or
                      abandoned
                    </span>
                  </li>
                </ul>
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="item-2">
            <AccordionTrigger>What metrics are measured?</AccordionTrigger>
            <AccordionContent>
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-foreground mb-1">
                    Quality Factors (100 pts total)
                  </h4>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li>
                      Issue Health ({quality.issueHealth.total} pts): open issue
                      ratio ({quality.issueHealth.openRatio} pts) + resolution
                      speed ({quality.issueHealth.resolutionSpeed} pts)
                    </li>
                    <li>
                      Release Health ({quality.releaseHealth.total} pts):
                      release cadence
                    </li>
                    <li>Community ({quality.community.total} pts): stars</li>
                    <li>Maturity ({quality.maturity.total} pts): repo age</li>
                    <li>
                      Activity Breadth ({quality.activityBreadth.total} pts):
                      active channels in the last year
                    </li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-foreground mb-1">
                    Expected Activity Tier
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Strictness adapts to repository expectations.
                  </p>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li>
                      <strong className="text-foreground">High expected</strong>
                      : any of commits 90d ≥
                      {expectedActivityCriteria.high.commitsLast90Days}, merged
                      PRs 90d ≥
                      {expectedActivityCriteria.high.mergedPrsLast90Days},
                      issues/year ≥
                      {expectedActivityCriteria.high.issuesCreatedLastYear},
                      open PRs ≥ {expectedActivityCriteria.high.openPrsCount},
                      stars ≥ {expectedActivityCriteria.high.stars}
                    </li>
                    <li>
                      <strong className="text-foreground">
                        Medium expected
                      </strong>
                      : any of commits 90d ≥
                      {expectedActivityCriteria.medium.commitsLast90Days},
                      merged PRs 90d ≥
                      {expectedActivityCriteria.medium.mergedPrsLast90Days},
                      issues/year ≥
                      {expectedActivityCriteria.medium.issuesCreatedLastYear},
                      open PRs ≥ {expectedActivityCriteria.medium.openPrsCount},
                      stars ≥ {expectedActivityCriteria.medium.stars}
                    </li>
                    <li>
                      <strong className="text-foreground">Low expected</strong>:
                      everything else
                    </li>
                  </ul>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="item-3">
            <AccordionTrigger>
              How severe are stale-project penalties?
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-3 text-muted-foreground">
                <p>
                  Freshness uses days since the most recent activity (commit,
                  merged PR, or release). Expected-active repositories are
                  penalized more aggressively.
                </p>
                <div className="text-sm space-y-2">
                  <p>
                    <strong className="text-foreground">High expected:</strong>{" "}
                    {formatFreshnessTimeline(freshnessMultipliers.high)}
                  </p>
                  <p>
                    <strong className="text-foreground">
                      Medium expected:
                    </strong>{" "}
                    {formatFreshnessTimeline(freshnessMultipliers.medium)}
                  </p>
                  <p>
                    <strong className="text-foreground">Low expected:</strong>{" "}
                    {formatFreshnessTimeline(freshnessMultipliers.low)}
                  </p>
                </div>
                <p className="text-sm">
                  Extra cap for high-expected repositories:{" "}
                  {highExpectedHardCapText}.
                </p>
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="item-4">
            <AccordionTrigger>
              Why is scoring stricter than other tools?
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-3 text-muted-foreground">
                <p>
                  This tool is intentionally strict for stale expected-active
                  repos. Popularity does not override inactivity.
                </p>
                <ul className="space-y-2 text-sm">
                  <li>
                    <strong className="text-foreground">
                      Strong history is not enough.
                    </strong>{" "}
                    A project can be excellent historically but risky if
                    maintenance has gone quiet.
                  </li>
                  <li>
                    <strong className="text-foreground">
                      Dependency risk grows with inactivity.
                    </strong>{" "}
                    Stale projects are slower to patch bugs and security issues.
                  </li>
                  <li>
                    <strong className="text-foreground">
                      Early warning is the goal.
                    </strong>{" "}
                    The score highlights risk before a project is fully dead.
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
