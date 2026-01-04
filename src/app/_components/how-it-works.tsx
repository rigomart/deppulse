import { Container } from "@/components/container";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";

const categoryColors = {
  excellent: "bg-green-500/15 text-green-400 border-green-500/30",
  good: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  fair: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  poor: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  critical: "bg-red-500/15 text-red-400 border-red-500/30",
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
                      className={`capitalize shrink-0 border ${categoryColors.excellent}`}
                    >
                      Excellent
                    </Badge>
                    <span className="text-muted-foreground">
                      80-100: Actively maintained with strong community
                      engagement
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Badge
                      className={`capitalize shrink-0 border ${categoryColors.good}`}
                    >
                      Good
                    </Badge>
                    <span className="text-muted-foreground">
                      60-79: Well maintained and suitable for production use
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Badge
                      className={`capitalize shrink-0 border ${categoryColors.fair}`}
                    >
                      Fair
                    </Badge>
                    <span className="text-muted-foreground">
                      40-59: Adequate maintenance with some areas of concern
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Badge
                      className={`capitalize shrink-0 border ${categoryColors.poor}`}
                    >
                      Poor
                    </Badge>
                    <span className="text-muted-foreground">
                      20-39: Limited maintenance activity
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Badge
                      className={`capitalize shrink-0 border ${categoryColors.critical}`}
                    >
                      Critical
                    </Badge>
                    <span className="text-muted-foreground">
                      0-19: Appears unmaintained or abandoned
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
                    Responsiveness (30%)
                  </h4>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li>Issue resolution time (12 pts)</li>
                    <li>Open issues percentage (12 pts)</li>
                    <li>Issue velocity (6 pts)</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-foreground mb-1">
                    Stability (20%)
                  </h4>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li>Release recency (12 pts)</li>
                    <li>Project age (8 pts)</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-foreground mb-1">
                    Community (10%)
                  </h4>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li>Open pull requests (5 pts)</li>
                    <li>Stars and forks (5 pts)</li>
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
                  and popularity. Mature projects get slightly relaxed
                  thresholds for commit recency, while still maintaining strict
                  standards.
                </p>
                <ul className="space-y-1 text-sm">
                  <li>
                    <strong className="text-foreground">Emerging</strong>: Less
                    than 2 years old and under 1k stars. Strictest thresholds.
                  </li>
                  <li>
                    <strong className="text-foreground">Growing</strong>: 2-5
                    years old or 1k-10k stars. Relaxed thresholds.
                  </li>
                  <li>
                    <strong className="text-foreground">Mature</strong>: 5+
                    years old and 10k+ stars. Most relaxed, but still strict.
                  </li>
                </ul>
                <p className="text-sm">
                  <strong className="text-foreground">Note:</strong> Even mature
                  projects lose points after 6 months of no commits. Issue
                  velocity helps distinguish genuinely finished projects from
                  abandoned ones.
                </p>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </section>
    </Container>
  );
}
