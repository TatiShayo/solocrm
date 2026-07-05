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
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface DealSizeDistributionProps {
  deals: Deal[];
}

const BUCKETS = [
  { name: "$0-1K", min: 0, max: 1000 },
  { name: "$1K-5K", min: 1000, max: 5000 },
  { name: "$5K-10K", min: 5000, max: 10000 },
  { name: "$10K-50K", min: 10000, max: 50000 },
  { name: "$50K+", min: 50000, max: Infinity },
];

export default function DealSizeDistribution({
  deals,
}: DealSizeDistributionProps) {
  const bucketedData = BUCKETS.map((bucket) => {
    const count = deals.filter(
      (deal) => deal.value >= bucket.min && deal.value < bucket.max
    ).length;
    return { name: bucket.name, count };
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Deal Size Distribution</CardTitle>
        <CardDescription>
          Number of deals in different value ranges.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={bucketedData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#4f46e5" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
