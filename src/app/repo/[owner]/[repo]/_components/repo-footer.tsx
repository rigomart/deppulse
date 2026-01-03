import { Clock } from "lucide-react";
import type { Assessment } from "@/db/schema";
import { RepoContainer } from "./repo-container";

export function RepoFooter({ assessment }: { assessment: Assessment }) {
  return (
    <RepoContainer className="flex items-center gap-2 text-sm text-muted-foreground">
      <Clock className="w-4 h-4" />
      <span>
        Last analyzed: {new Date(assessment.analyzedAt).toLocaleString()}
      </span>
    </RepoContainer>
  );
}
