"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import { StageColumn } from "./stage-column";
import { DealCard } from "./deal-card";
import { moveDeal } from "../actions";
import { formatCurrency } from "@/lib/format";
import { TrendingUp } from "lucide-react";
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
  pipelineId: string;
}

export function KanbanBoard({ stages, deals, stageNames, pipelineId }: Props) {
  const router = useRouter();
  const [dealsList, setDealsList] = useState(deals);
  const [activeDeal, setActiveDeal] = useState<DealWithContact | null>(null);
  const [wonAnim, setWonAnim] = useState(false);
  const [lostAnim, setLostAnim] = useState(false);
  const [lostTitle, setLostTitle] = useState("");

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === "n" &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.altKey &&
        document.activeElement?.tagName !== "INPUT" &&
        document.activeElement?.tagName !== "TEXTAREA" &&
        (document.activeElement as HTMLElement)?.contentEditable !== "true"
      ) {
        e.preventDefault();
        router.push(`/dashboard/pipeline/deals/new?pipeline=${pipelineId}`);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [pipelineId, router]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 250, tolerance: 5 },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const deal = dealsList.find((d) => d.id === event.active.id);
    if (deal) setActiveDeal(deal);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const dealId = String(active.id);
    const stageId = String(over.id);

    const deal = dealsList.find((d) => d.id === dealId);
    if (!deal || deal.stage_id === stageId) return;

    setDealsList((prev) =>
      prev.map((d) => (d.id === dealId ? { ...d, stage_id: stageId } : d))
    );
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || !activeDeal) {
      setActiveDeal(null);
      setDealsList(deals);
      return;
    }

    const dealId = String(active.id);
    const stageId = String(over.id);

    setActiveDeal(null);

    if (activeDeal.stage_id === stageId) {
      setDealsList(deals);
      return;
    }

    const result = await moveDeal(dealId, stageId);

    if (result?.isWon) {
      setDealsList((prev) => prev.filter((d) => d.id !== dealId));
      setWonAnim(true);
      setTimeout(() => setWonAnim(false), 2500);
    } else if (result?.isLost) {
      setLostTitle(activeDeal.title);
      setLostAnim(true);
      setTimeout(() => {
        setLostAnim(false);
        setDealsList((prev) => prev.filter((d) => d.id !== dealId));
      }, 2000);
    }
  };

  const forecastValue = dealsList.reduce(
    (sum, d) => sum + d.value * (d.probability / 100),
    0
  );
  const totalDealValue = dealsList.reduce((sum, d) => sum + d.value, 0);
  const forecastPercent = totalDealValue > 0 ? (forecastValue / totalDealValue) * 100 : 0;

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
    <>
      <div className="mb-6 rounded-lg border bg-card p-4">
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp className="h-5 w-5 text-cyan-500" />
          <span className="text-sm font-medium text-muted-foreground">Revenue Forecast</span>
        </div>
        <div className="flex items-baseline gap-3 mb-3">
          <span className="text-2xl font-bold">{formatCurrency(forecastValue)}</span>
          <span className="text-sm text-muted-foreground">
            weighted ({formatCurrency(totalDealValue)} total)
          </span>
        </div>
        <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-emerald-500 transition-all duration-500"
            style={{ width: `${Math.min(forecastPercent, 100)}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Σ (deal value × probability) across {dealsList.length} open deal{dealsList.length !== 1 ? "s" : ""}
        </p>
      </div>

      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-4 min-h-[60vh] items-start sm:flex-row flex-col">
          {stageColumns}
        </div>

        <DragOverlay>
          {activeDeal ? <DealCard deal={activeDeal} /> : null}
        </DragOverlay>
      </DndContext>

      {wonAnim && (
        <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center">
          <div className="text-center animate-bounce-in">
            <div className="text-6xl mb-4">🎉</div>
            <p className="text-2xl font-bold text-green-600">Deal Won!</p>
            <div className="confetti-container">
              {Array.from({ length: 20 }).map((_, i) => (
                <div
                  key={i}
                  className="confetti-piece"
                  style={{
                    left: `${Math.random() * 100}%`,
                    animationDelay: `${Math.random() * 0.5}s`,
                    backgroundColor: ["#f59e0b", "#06b6d4", "#10b981", "#f43f5e", "#8b5cf6"][i % 5],
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {lostAnim && (
        <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center">
          <div className="bg-background border rounded-lg shadow-2xl p-8 text-center lost-fade">
            <p className="text-xl font-bold text-muted-foreground line-through mb-2">
              {lostTitle}
            </p>
            <p className="text-sm text-muted-foreground">
              Deal Lost
            </p>
          </div>
        </div>
      )}

      <style>{`
        @keyframes confetti-fall {
          0% { transform: translateY(-20px) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
        .confetti-piece {
          position: absolute;
          width: 10px;
          height: 10px;
          border-radius: 2px;
          animation: confetti-fall 1.5s ease-in forwards;
        }
        @keyframes bounce-in {
          0% { transform: scale(0); }
          50% { transform: scale(1.2); }
          100% { transform: scale(1); }
        }
        .animate-bounce-in {
          animation: bounce-in 0.5s ease-out;
        }
        @keyframes lost-anim {
          0% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(0.95); }
          100% { opacity: 0; transform: scale(0.9); }
        }
        .lost-fade {
          animation: lost-anim 2s ease-out forwards;
        }
      `}</style>
    </>
  );
}
