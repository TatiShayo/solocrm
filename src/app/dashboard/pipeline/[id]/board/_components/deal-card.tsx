"use client";

import { useState } from "react";
import { useDraggable } from "@dnd-kit/core";
import Link from "next/link";
import { Clock, DollarSign } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { updateDealValue } from "./actions";

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

  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(deal.value.toString());
  const [saving, setSaving] = useState(false);

  const daysInStage = daysBetween(new Date(deal.created_at), new Date());
  const ageColor =
    daysInStage > 14
      ? "bg-red-500"
      : daysInStage > 7
        ? "bg-amber-500"
        : "";

  const dragStyle = isDragging
    ? "opacity-40 scale-[1.03] shadow-xl rotate-[2deg] z-50"
    : "";

  const style = transform
    ? {
        transform: `translate(${transform.x}px, ${transform.y}px)`,
        zIndex: 50,
      }
    : undefined;

  const handleValueClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setEditing(true);
  };

  const handleValueSave = async () => {
    const num = Number(editValue);
    if (isNaN(num) || num < 0) return;
    setSaving(true);
    await updateDealValue(deal.id, num);
    setSaving(false);
    setEditing(false);
  };

  return (
    <Link
      ref={setNodeRef}
      href={`/dashboard/pipeline/deals/${deal.id}`}
      style={style}
      {...listeners}
      {...attributes}
      className={`block rounded-md border bg-background p-3 hover:border-primary/50 transition-all cursor-grab active:cursor-grabbing ${dragStyle}`}
    >
      <div className="flex items-center gap-2">
        {ageColor && (
          <div
            className={`w-2 h-2 rounded-full flex-shrink-0 ${ageColor}`}
            title={
              daysInStage > 14
                ? "Stuck >14 days"
                : "Stuck >7 days"
            }
          />
        )}
        <p className="text-sm font-medium truncate">{deal.title}</p>
      </div>
      <p className="text-xs text-muted-foreground mt-0.5">
        {deal.contact.name}
      </p>
      <div className="flex items-center justify-between mt-2">
        {editing ? (
          <div
            className="flex items-center gap-1"
            onClick={(e) => e.preventDefault()}
          >
            <span className="text-xs">$</span>
            <input
              type="number"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={handleValueSave}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleValueSave();
                if (e.key === "Escape") setEditing(false);
              }}
              className="w-20 h-6 rounded border border-input bg-background px-1 text-xs"
              autoFocus
              disabled={saving}
            />
          </div>
        ) : (
          <div
            className="flex items-center gap-1 text-xs text-muted-foreground cursor-pointer hover:text-foreground"
            onClick={handleValueClick}
            title="Click to edit value"
          >
            <DollarSign className="h-3 w-3" />
            <span>{formatCurrency(deal.value)}</span>
          </div>
        )}
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

