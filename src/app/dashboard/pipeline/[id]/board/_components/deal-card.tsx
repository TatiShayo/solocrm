"use client";

import { useDraggable } from "@dnd-kit/core";
import Link from "next/link";
import { Clock, DollarSign } from "lucide-react";
import { formatCurrency } from "@/lib/format";

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
  deal: DealWithContact;
}

function daysBetween(a: Date, b: Date) {
  const ms = b.getTime() - a.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

export function DealCard({ deal }: Props) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: deal.id,
      data: { deal },
    });

  const style = transform
    ? {
        transform: `translate(${transform.x}px, ${transform.y}px)`,
        zIndex: 50,
      }
    : undefined;

  const daysInStage = daysBetween(new Date(deal.created_at), new Date());

  return (
    <Link
      ref={setNodeRef}
      href={`/dashboard/pipeline/deals/${deal.id}`}
      style={style}
      {...listeners}
      {...attributes}
      className={`block rounded-md border bg-background p-3 hover:border-primary/50 transition-colors cursor-grab active:cursor-grabbing ${
        isDragging ? "opacity-50 shadow-lg" : ""
      }`}
    >
      <p className="text-sm font-medium truncate">{deal.title}</p>
      <p className="text-xs text-muted-foreground mt-0.5">
        {deal.contact.name}
      </p>
      <div className="flex items-center justify-between mt-2">
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <DollarSign className="h-3 w-3" />
          <span>{formatCurrency(deal.value)}</span>
        </div>
        <span className="text-xs font-medium">{deal.probability}%</span>
      </div>
      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
        <Clock className="h-3 w-3" />
        <span>
          {daysInStage} day{daysInStage !== 1 ? "s" : ""} in stage
        </span>
      </div>
    </Link>
  );
}
