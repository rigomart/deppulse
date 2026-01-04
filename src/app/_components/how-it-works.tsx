import { Container } from "@/components/container";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";

const categoryColors = {
  healthy: "bg-green-500/15 text-green-400 border-green-500/30",
  moderate: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  "at-risk": "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  unmaintained: "bg-red-500/15 text-red-400 border-red-500/30",
};

export function HowItWorks() {
  return (
    <Container>
      <section className="space-y-4">
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
                      70-100: Actively maintained with strong community
                      engagement
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Badge
                      className={`shrink-0 border ${categoryColors.moderate}`}
                    >
                      Moderate
                    </Badge>
                    <span className="text-muted-foreground">
                      45-69: Adequately maintained or stable utility
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Badge
                      className={`shrink-0 border ${categoryColors["at-risk"]}`}
                    >
                      At Risk
                    </Badge>
                    <span className="text-muted-foreground">
                      20-44: Signs of declining maintenance, evaluate
                      alternatives
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Badge
                      className={`shrink-0 border ${categoryColors.unmaintained}`}
                    >
                      Unmaintained
                    </Badge>
                    <span className="text-muted-foreground">
                      0-19: Appears abandoned, avoid for new projects
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
                    Activity (40%)
                  </h4>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li>Last commit recency (25 pts)</li>
                    <li>Commit volume in last 90 days (15 pts)</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-foreground mb-1">
                    Responsiveness (40%)
                  </h4>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li>Open issues percentage (15 pts)</li>
                    <li>Issue resolution time (15 pts)</li>
                    <li>Issue velocity (10 pts)</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-foreground mb-1">
                    Stability (12%)
                  </h4>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li>Release recency (7 pts)</li>
                    <li>Project age (5 pts)</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-foreground mb-1">
                    Community (8%)
                  </h4>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li>Open pull requests (4 pts)</li>
                    <li>Stars and forks (4 pts)</li>
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
                    than 2 years old and under 1k stars. Strictest thresholds.
                  </li>
                  <li>
                    <strong className="text-foreground">Growing</strong>: 2-5
                    years old or 1k-10k stars. Moderate thresholds.
                  </li>
                  <li>
                    <strong className="text-foreground">Mature</strong>: 5+
                    years old or 10k+ stars. Relaxed thresholds for
                    feature-complete projects.
                  </li>
                </ul>
                <p className="text-sm">
                  <strong className="text-foreground">Note:</strong> Low open
                  issue percentage and low issue velocity distinguish genuinely
                  finished projects from abandoned ones. Projects with many
                  unresolved issues are penalized regardless of maturity.
                </p>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </section>
    </Container>
  );
}
