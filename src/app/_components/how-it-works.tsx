import { Container } from "@/components/container";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { categoryColors } from "@/lib/category-styles";
import { MAINTENANCE_CONFIG } from "@/lib/maintenance-config";

const { categoryThresholds, weights, maturityCriteria } = MAINTENANCE_CONFIG;

export function HowItWorks() {
  return (
    <Container>
      <section className="space-y-4 animate-in fade-in duration-300 delay-300 fill-mode-backwards">
        <h2 className="text-xl font-semibold tracking-tight">How It Works</h2>

        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="item-1">
            <AccordionTrigger>How does scoring work?</AccordionTrigger>
            <AccordionContent>
              <div className="space-y-3">
                <p className="text-muted-foreground">
                  Repositories receive a maintenance score from 0-100 based on
                  activity, responsiveness, stability, and community signals.
                  Higher scores indicate healthier maintenance.
                </p>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <Badge
                      className={`shrink-0 border ${categoryColors.healthy}`}
                    >
                      Healthy
                    </Badge>
                    <span className="text-muted-foreground">
                      {categoryThresholds.healthy}-100: Actively maintained with
                      strong community engagement
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
                      {categoryThresholds.healthy - 1}: Adequately maintained or
                      stable utility
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Badge
                      className={`shrink-0 border ${categoryColors.declining}`}
                    >
                      Declining
                    </Badge>
                    <span className="text-muted-foreground">
                      {categoryThresholds.atRisk}-
                      {categoryThresholds.moderate - 1}: Signs of declining
                      maintenance, evaluate alternatives
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Badge
                      className={`shrink-0 border ${categoryColors.inactive}`}
                    >
                      Inactive
                    </Badge>
                    <span className="text-muted-foreground">
                      0-{categoryThresholds.atRisk - 1}: No recent activity.
                      Could be stable/feature-complete or unmaintained
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
                    Activity ({weights.activity.total}%)
                  </h4>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li>
                      Last commit recency ({weights.activity.lastCommit} pts)
                    </li>
                    <li>
                      Commit volume in last year (
                      {weights.activity.commitVolume} pts)
                    </li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-foreground mb-1">
                    Responsiveness ({weights.responsiveness.total}%)
                  </h4>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li>
                      Issue resolution time (
                      {weights.responsiveness.issueResolution} pts)
                    </li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-foreground mb-1">
                    Stability ({weights.stability.total}%)
                  </h4>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li>
                      Release recency ({weights.stability.releaseRecency} pts)
                    </li>
                    <li>Project age ({weights.stability.projectAge} pts)</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-foreground mb-1">
                    Community ({weights.community.total}%)
                  </h4>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li>
                      Stars and forks ({weights.community.popularity} pts)
                    </li>
                  </ul>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="item-3">
            <AccordionTrigger>
              How does maturity affect scoring?
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-3 text-muted-foreground">
                <p>
                  Projects are classified into three maturity tiers based on age
                  and popularity. Mature projects get relaxed thresholds,
                  recognizing that stable utilities may not need frequent
                  updates.
                </p>
                <ul className="space-y-1 text-sm">
                  <li>
                    <strong className="text-foreground">Emerging</strong>: Less
                    than {maturityCriteria.growingMinAgeYears} years old and
                    under {(maturityCriteria.growingMinStars / 1000).toFixed(0)}
                    k stars. Strictest thresholds.
                  </li>
                  <li>
                    <strong className="text-foreground">Growing</strong>:{" "}
                    {maturityCriteria.growingMinAgeYears}-
                    {maturityCriteria.matureMinAgeYears} years old or{" "}
                    {(maturityCriteria.growingMinStars / 1000).toFixed(0)}k-
                    {(maturityCriteria.matureMinStars / 1000).toFixed(0)}k
                    stars. Moderate thresholds.
                  </li>
                  <li>
                    <strong className="text-foreground">Mature</strong>:{" "}
                    {maturityCriteria.matureMinAgeYears}+ years old or{" "}
                    {(maturityCriteria.matureMinStars / 1000).toFixed(0)}k+
                    stars. Relaxed thresholds for feature-complete projects.
                  </li>
                </ul>
                <p className="text-sm">
                  <strong className="text-foreground">Note:</strong> Activity is
                  weighted heavily ({weights.activity.total}%) because commits
                  are the strongest signal of ongoing maintenance. Even mature
                  projects need occasional activity to show they&apos;re not
                  abandoned.
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
                  This tool is intentionally more aggressive about penalizing
                  inactivity than alternatives like Snyk Advisor or npm package
                  scores. Here&apos;s why:
                </p>
                <ul className="space-y-2 text-sm">
                  <li>
                    <strong className="text-foreground">
                      Stars don&apos;t equal maintenance.
                    </strong>{" "}
                    Popular projects can become abandoned. A project with 50k
                    stars but no commits in 2 years and 200 open issues is a
                    liability, not an asset.
                  </li>
                  <li>
                    <strong className="text-foreground">
                      Dependencies are attack vectors.
                    </strong>{" "}
                    Unmaintained packages don&apos;t receive security patches.
                    Better to know early than after a vulnerability is
                    discovered.
                  </li>
                  <li>
                    <strong className="text-foreground">
                      Proactive over reactive.
                    </strong>{" "}
                    Other tools wait until a project is clearly dead. We flag
                    warning signs earlier so you can plan migrations before
                    they&apos;re urgent.
                  </li>
                </ul>
                <p className="text-sm">
                  The goal is to surface potential risks, not to definitively
                  label projects. Use the score as one input in your dependency
                  decisions, alongside your own evaluation.
                </p>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </section>
    </Container>
  );
}
