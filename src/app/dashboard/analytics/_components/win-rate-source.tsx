"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Deal } from "@/lib/types";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface WinRateBySourceProps {
  deals: Deal[];
}

const COLORS = {
  "Cold Email": "#3b82f6", // blue-500
  "Referral": "#22c55e", // green-500
  "Inbound": "#8b5cf6", // violet-500
  "Other": "#64748b", // slate-500
};

type Source = keyof typeof COLORS;

export default function WinRateBySource({ deals }: WinRateBySourceProps) {
  const sourceData = deals.reduce(
    (acc, deal) => {
      const source = (deal.contact?.source as Source) || "Other";
      if (!acc[source]) {
        acc[source] = { total: 0, won: 0 };
      }
      acc[source].total++;
      if (deal.status === "won") {
        acc[source].won++;
      }
      return acc;
    },
    {} as Record<Source, { total: number; won: number }>
  );

  const chartData = Object.entries(sourceData).map(([name, data]) => ({
    name,
    value: data.total > 0 ? (data.won / data.total) * 100 : 0,
    ...data,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Win Rate by Source</CardTitle>
        <CardDescription>
          Effectiveness of different lead sources.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Tooltip formatter={(value) => typeof value === 'number' ? `${value.toFixed(1)}%` : ''} />
              <Legend />
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={80}
                fill="#8884d8"
                label={(entry) => `${entry.name} (${entry.value.toFixed(0)}%)`}
              >
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[entry.name as Source]}
                  />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Source</TableHead>
              <TableHead className="text-right">Total Deals</TableHead>
              <TableHead className="text-right">Won Deals</TableHead>
              <TableHead className="text-right">Win Rate</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {chartData.map((data) => (
              <TableRow key={data.name}>
                <TableCell>{data.name}</TableCell>
                <TableCell className="text-right">{data.total}</TableCell>
                <TableCell className="text-right">{data.won}</TableCell>
                <TableCell className="text-right">
                  {data.value.toFixed(1)}%
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
