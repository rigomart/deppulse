"use client";

import { ChevronDown } from "lucide-react";
import { useCallback, useState } from "react";
import { Streamdown } from "streamdown";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const COLLAPSED_HEIGHT = 400;

interface ReadmeContentProps {
  content: string;
}

export function ReadmeContent({ content }: ReadmeContentProps) {
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);

  const measureRef = useCallback((node: HTMLDivElement | null) => {
    if (node) {
      setOverflows(node.scrollHeight > COLLAPSED_HEIGHT);
    }
  }, []);

  return (
    <Card>
      <CardContent>
        <div
          ref={measureRef}
          className={cn(
            "relative overflow-hidden",
            overflows && !expanded && "max-h-[400px]",
          )}
        >
          <Streamdown
            mode="static"
            disallowedElements={["img"]}
            components={{
              a: ({ href, children, ...props }) => (
                <a
                  href={href ?? "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-foreground underline underline-offset-2 hover:text-foreground/80 transition-colors"
                  {...props}
                >
                  {children}
                </a>
              ),
            }}
          >
            {content}
          </Streamdown>
          {!expanded && overflows && (
            <div className="absolute inset-x-0 bottom-0 h-24 bg-linear-to-t from-surface-2 to-transparent pointer-events-none" />
          )}
        </div>
        {overflows && (
          <button
            type="button"
            onClick={() => setExpanded((prev) => !prev)}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mt-3 cursor-pointer"
          >
            <ChevronDown className={cn("size-4", expanded && "rotate-180")} />
            {expanded ? "Show less" : "Show more"}
          </button>
        )}
      </CardContent>
    </Card>
  );
}
