"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Deal, Stage } from "@/lib/types";
import { differenceInDays } from "date-fns";

interface PipelineVelocityProps {
  deals: Deal[];
  stages: Pick<Stage, "id" | "name">[];
}

export default function PipelineVelocity({
  deals,
  stages,
}: PipelineVelocityProps) {
  // NOTE: This is a simplified calculation. A more accurate implementation
  // would require tracking stage change history (e.g., in an activity log).
  // This component calculates the average time deals have been in their *current*
  // stage, using the deal's `updated_at` field as a proxy for when it entered
  // the current stage.
  const now = new Date();

  const stageData = stages.map((stage) => {
    const dealsInStage = deals.filter((deal) => deal.stage_id === stage.id && deal.status === 'open');
    if (dealsInStage.length === 0) {
      return { name: stage.name, avgDays: 0 };
    }

    const totalDaysInStage = dealsInStage.reduce((acc, deal) => {
      const days = differenceInDays(now, new Date(deal.updated_at));
      return acc + days;
    }, 0);

    const avgDays = Math.round(totalDaysInStage / dealsInStage.length);
    return { name: stage.name, avgDays };
  });

  const maxAvgDays = Math.max(...stageData.map((d) => d.avgDays), 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pipeline Velocity</CardTitle>
        <CardDescription>Average time (in days) a deal spends in each stage.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {stageData.map((stage) => (
            <div key={stage.name} className="flex items-center gap-4">
              <div className="w-24 text-sm text-muted-foreground truncate">
                {stage.name}
              </div>
              <div className="flex-1 bg-muted rounded-full h-4">
                <div
                  className="bg-blue-500 h-4 rounded-full"
                  style={{
                    width: maxAvgDays > 0 ? `${(stage.avgDays / maxAvgDays) * 100}%` : '0%',
                  }}
                />
              </div>
              <div className="w-12 text-right font-medium">{stage.avgDays}d</div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
