"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area,
} from "recharts";
import { Card } from "@/shared/ui/Card";
import { cn } from "@/shared/utils/cn";

const COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#f43f5e",
  "#f97316", "#eab308", "#22c55e", "#14b8a6",
  "#06b6d4", "#3b82f6",
];

type ChartType = "bar" | "pie" | "line" | "area";

interface ChartData {
  name: string;
  value: number;
  [key: string]: string | number;
}

interface AnalyticsChartProps {
  type?: ChartType;
  title?: string;
  data: ChartData[];
  dataKey?: string;
  xKey?: string;
  height?: number;
  className?: string;
  loading?: boolean;
}

export function AnalyticsChart({
  type = "bar",
  title,
  data,
  dataKey = "value",
  xKey = "name",
  height = 300,
  className,
  loading,
}: AnalyticsChartProps) {
  if (loading) {
    return (
      <Card className={className}>
        {title && (
          <div className="mb-4 h-5 w-32 animate-pulse rounded bg-surface-200 dark:bg-surface-700" />
        )}
        <div className="flex h-[300px] items-center justify-center">
          <div className="h-[250px] w-full animate-pulse rounded bg-surface-100 dark:bg-surface-800" />
        </div>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card className={className}>
        {title && (
          <h3 className="mb-4 text-sm font-semibold text-surface-700 dark:text-surface-200">
            {title}
          </h3>
        )}
        <div className="flex h-[300px] items-center justify-center text-sm text-surface-400">
          Нет данных для отображения
        </div>
      </Card>
    );
  }

  const renderChart = () => {
    switch (type) {
      case "bar":
        return (
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey={xKey} tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            <Bar dataKey={dataKey} radius={[4, 4, 0, 0]}>
              {data.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        );

      case "pie":
        return (
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) =>
                `${name} ${(percent * 100).toFixed(0)}%`
              }
              outerRadius={100}
              dataKey={dataKey}
            >
              {data.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        );

      case "line":
        return (
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey={xKey} tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            <Line
              type="monotone"
              dataKey={dataKey}
              stroke="#6366f1"
              strokeWidth={2}
              dot={{ fill: "#6366f1" }}
            />
          </LineChart>
        );

      case "area":
        return (
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey={xKey} tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            <Area
              type="monotone"
              dataKey={dataKey}
              stroke="#6366f1"
              fill="#6366f1"
              fillOpacity={0.1}
            />
          </AreaChart>
        );
    }
  };

  return (
    <Card className={className}>
      {title && (
        <h3 className="mb-4 text-sm font-semibold text-surface-700 dark:text-surface-200">
          {title}
        </h3>
      )}
      <ResponsiveContainer width="100%" height={height}>
        {renderChart()}
      </ResponsiveContainer>
    </Card>
  );
}
