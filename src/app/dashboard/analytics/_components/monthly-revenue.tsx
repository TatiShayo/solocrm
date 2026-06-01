"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Deal } from "@/lib/types";
import { formatCurrency } from "@/lib/format";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { subMonths, format, startOfMonth } from "date-fns";

interface MonthlyRevenueProps {
  deals: Deal[];
}

export default function MonthlyRevenue({ deals }: MonthlyRevenueProps) {
  const last12Months = Array.from({ length: 12 }, (_, i) =>
    subMonths(new Date(), i)
  ).reverse();

  const monthlyData = last12Months.map((monthDate) => {
    const monthStart = startOfMonth(monthDate);
    const dealsInMonth = deals.filter((deal) => {
      const closeDate = new Date(deal.close_date!);
      return (
        closeDate.getFullYear() === monthStart.getFullYear() &&
        closeDate.getMonth() === monthStart.getMonth()
      );
    });
    const revenue = dealsInMonth.reduce((sum, deal) => sum + deal.value, 0);
    return {
      name: format(monthStart, "MMM yy"),
      revenue,
    };
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Monthly Closed Revenue</CardTitle>
        <CardDescription>
          Revenue from deals won over the last 12 months.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={monthlyData}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis tickFormatter={(value) => typeof value === 'number' ? formatCurrency(value) : ''} />
              <Tooltip formatter={(value) => typeof value === 'number' ? formatCurrency(value) : ''} />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#10b981"
                fillOpacity={1}
                fill="url(#colorRevenue)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
