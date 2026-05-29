"use client";

import { useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { StageColumn } from "./stage-column";
import { DealCard } from "./deal-card";
import { moveDeal } from "../actions";
import type { Stage } from "@/lib/types";

interface DealWithContact {
  id: string;
  title: string;
  value: number;
  probability: number;
  stage_id: string;
  contact: { name: string };
  created_at: string;
}

interface Props {
  stages: Stage[];
  deals: DealWithContact[];
  stageNames: Record<string, string>;
}

export function KanbanBoard({ stages, deals, stageNames }: Props) {
  const [dealsList, setDealsList] = useState(deals);
  const [activeDeal, setActiveDeal] = useState<DealWithContact | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const deal = dealsList.find((d) => d.id === event.active.id);
    if (deal) setActiveDeal(deal);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveDeal(null);
    const { active, over } = event;
    if (!over) return;

    const dealId = String(active.id);
    const stageId = String(over.id);

    const deal = dealsList.find((d) => d.id === dealId);
    if (!deal || deal.stage_id === stageId) return;

    setDealsList((prev) =>
      prev.map((d) => (d.id === dealId ? { ...d, stage_id: stageId } : d))
    );

    await moveDeal(dealId, stageId);
  };

  const stageColumns = stages
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((stage, i) => {
      const columnDeals = dealsList.filter((d) => d.stage_id === stage.id);
      return (
        <StageColumn
          key={stage.id}
          stageId={stage.id}
          stageName={stage.name}
          deals={columnDeals}
          isLast={i === stages.length - 1}
        />
      );
    });

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4 min-h-[60vh] items-start">
        {stageColumns}
      </div>

      <DragOverlay>
        {activeDeal ? <DealCard deal={activeDeal} /> : null}
      </DragOverlay>
    </DndContext>
  );
}
