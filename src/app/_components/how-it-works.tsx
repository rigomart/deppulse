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

const { categoryThresholds, quality } = MAINTENANCE_CONFIG;

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
                  Repositories receive a maintenance score from 0-100 based on
                  two factors: <strong>engagement</strong> (how recently any
                  maintenance activity occurred) and <strong>quality</strong>{" "}
                  (issue health, release cadence, community, and breadth of
                  activity). The final score is quality multiplied by
                  engagement.
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
                      {categoryThresholds.declining}-
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
                      0-{categoryThresholds.declining - 1}: No recent activity.
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
                    Engagement Factor
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Measures how recently ANY development activity occurred
                    across three channels: commits, PR merges, and releases.
                    Recent activity gets full credit; longer gaps reduce the
                    multiplier.
                  </p>
                </div>
                <div>
                  <h4 className="font-medium text-foreground mb-1">
                    Issue Health ({quality.issueHealth.total} pts)
                  </h4>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li>
                      Open issues ratio ({quality.issueHealth.openRatio} pts)
                    </li>
                    <li>
                      Resolution speed ({quality.issueHealth.resolutionSpeed}{" "}
                      pts)
                    </li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-foreground mb-1">
                    Release Health ({quality.releaseHealth.total} pts)
                  </h4>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li>
                      Release cadence ({quality.releaseHealth.cadence} pts)
                    </li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-foreground mb-1">
                    Community ({quality.community.total} pts)
                  </h4>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li>Stars ({quality.community.stars} pts)</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-foreground mb-1">
                    Activity Breadth ({quality.activityBreadth.total} pts)
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    How many development channels (commits, PR merges, releases)
                    showed activity in the last year.
                  </p>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="item-3">
            <AccordionTrigger>
              How does engagement affect scoring?
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-3 text-muted-foreground">
                <p>
                  The engagement factor acts as a multiplier on the quality
                  score. It looks at the most recent development activity across
                  all channels: commits, PR merges, and releases.
                </p>
                <ul className="space-y-1 text-sm">
                  <li>
                    Activity within <strong>3 months</strong>: full credit
                    (1.0x)
                  </li>
                  <li>
                    Activity within <strong>6 months</strong>: reduced (0.8x)
                  </li>
                  <li>
                    Activity within <strong>1 year</strong>: significantly
                    reduced (0.5x)
                  </li>
                  <li>
                    Activity within <strong>2 years</strong>: low (0.2x)
                  </li>
                  <li>
                    No activity for <strong>2+ years</strong>: minimal (0.1x)
                  </li>
                </ul>
                <p className="text-sm">
                  This means a project with excellent quality metrics but no
                  maintenance activity for over 2 years will still score low,
                  because quality without engagement isn&apos;t reliable.
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
      </Container>
    </section>
  );
}
