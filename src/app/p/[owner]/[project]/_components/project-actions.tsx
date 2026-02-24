"use client";

import { ArrowRightLeft, EllipsisVertical } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { AnalysisRun } from "@/lib/domain/assessment";

interface ProjectActionsProps {
  run: AnalysisRun;
}

export function ProjectActions({ run }: ProjectActionsProps) {
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0"
          aria-label="Project actions"
        >
          <EllipsisVertical className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-surface-3">
        <DropdownMenuItem asChild>
          <Link
            href={`/compare?a=${encodeURIComponent(run.repository.fullName)}`}
          >
            <ArrowRightLeft className="size-4" />
            Compare
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
