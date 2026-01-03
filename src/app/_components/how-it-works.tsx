import { Container } from "@/components/container";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";

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
                  Repositories receive a risk score from 0-100 based on 6
                  weighted metrics. Lower scores indicate healthier maintenance.
                </p>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <Badge variant="secondary" className="capitalize shrink-0">
                      Active
                    </Badge>
                    <span className="text-muted-foreground">
                      0-20 points: Healthy maintenance with regular activity
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Badge variant="secondary" className="capitalize shrink-0">
                      Stable
                    </Badge>
                    <span className="text-muted-foreground">
                      21-40 points: Maintained but quieter; may be mature
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Badge variant="secondary" className="capitalize shrink-0">
                      At-Risk
                    </Badge>
                    <span className="text-muted-foreground">
                      41-65 points: Reduced maintenance activity
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Badge variant="secondary" className="capitalize shrink-0">
                      Abandoned
                    </Badge>
                    <span className="text-muted-foreground">
                      66-100 points: Unmaintained; high risk
                    </span>
                  </li>
                </ul>
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="item-2">
            <AccordionTrigger>What metrics are measured?</AccordionTrigger>
            <AccordionContent>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>
                  <strong className="text-foreground">
                    Last Commit Recency
                  </strong>{" "}
                  (30 pts max)
                </li>
                <li>
                  <strong className="text-foreground">Commit Volume</strong> (20
                  pts max)
                </li>
                <li>
                  <strong className="text-foreground">Last Release</strong> (15
                  pts max)
                </li>
                <li>
                  <strong className="text-foreground">Open Issues Ratio</strong>{" "}
                  (15 pts max)
                </li>
                <li>
                  <strong className="text-foreground">
                    Issue Resolution Time
                  </strong>{" "}
                  (10 pts max)
                </li>
                <li>
                  <strong className="text-foreground">
                    Open Pull Requests
                  </strong>{" "}
                  (10 pts max)
                </li>
              </ul>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="item-3">
            <AccordionTrigger>Why these strict thresholds?</AccordionTrigger>
            <AccordionContent>
              <div className="space-y-3 text-muted-foreground">
                <p>
                  Deppulse is designed as an early warning system for dependency
                  evaluation. It uses strict thresholds (30-day commit windows,
                  90-day activity checks) to catch maintenance decline early
                  rather than waiting until abandonment is obvious.
                </p>
                <p>
                  This approach works best for teams evaluating dependencies
                  where active maintenance is critical for security and
                  compatibility.
                </p>
                <p className="text-sm">
                  <strong className="text-foreground">Note:</strong> Stable,
                  mature projects with infrequent updates may score higher than
                  expected. Low activity doesn't always mean
                  abandonment—sometimes it means the project is complete.
                </p>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </section>
    </Container>
  );
}
