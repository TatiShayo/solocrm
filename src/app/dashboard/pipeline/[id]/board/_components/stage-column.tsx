"use client";

import { useDroppable } from "@dnd-kit/core";
import { DealCard } from "./deal-card";

interface DealWithContact {
  id: string;
  title: string;
  value: number;
  probability: number;
  stage_id: string;
  contact: { name: string };
  created_at: string;
}

interface StageColumnProps {
  stageId: string;
  stageName: string;
  deals: DealWithContact[];
  isLast: boolean;
}

export function StageColumn({ stageId, stageName, deals, isLast }: StageColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: stageId });

  const totalValue = deals.reduce((sum, d) => sum + d.value, 0);

  return (
    <div
      ref={setNodeRef}
      className={`flex-shrink-0 w-72 rounded-lg border bg-muted/30 flex flex-col max-h-full ${
        isOver ? "border-primary/50 bg-primary/5" : ""
      } ${isLast ? "border-destructive/20" : ""}`}
    >
      <div className="p-3 border-b bg-background/60 rounded-t-lg">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">{stageName}</h3>
          <span className="text-xs text-muted-foreground">
            {deals.length}
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">
          ${totalValue.toLocaleString()}
        </p>
      </div>
      <div className="p-2 space-y-2 overflow-y-auto flex-1">
        {deals.map((deal) => (
          <DealCard key={deal.id} deal={deal} />
        ))}
        {deals.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-4">
            No deals
          </p>
        )}
      </div>
    </div>
  );
}
