'use client';

import { Pie, PieChart, Cell, ResponsiveContainer } from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';

export type ShiftLocationDataInput = {
  name: string;
  count: number;
};

type ShiftLocationDataWithColor = ShiftLocationDataInput & {
  fill: string;
};

// Computed colors that work with Recharts (no CSS variables)
const CHART_COLORS = [
  '#3b82f6', // blue-500
  '#10b981', // emerald-500
  '#f59e0b', // amber-500
  '#ef4444', // red-500
  '#8b5cf6', // violet-500
  '#06b6d4', // cyan-500
  '#f97316', // orange-500
  '#84cc16', // lime-500
  '#ec4899', // pink-500
  '#6366f1', // indigo-500
];

function assignColors(
  locationCounts: ShiftLocationDataInput[]
): ShiftLocationDataWithColor[] {
  return locationCounts.map((item, index) => ({
    ...item,
    fill: CHART_COLORS[index % CHART_COLORS.length],
  }));
}

export function ShiftsByLocationChart({ data: inputData }: { data: ShiftLocationDataInput[] }) {
  const data = assignColors(inputData);
  if (data.length === 0) {
    return (
      <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
        No shifts data available
      </div>
    );
  }

  const total = data.reduce((sum, item) => sum + item.count, 0);

  // Build chart config from data
  const chartConfig = data.reduce(
    (acc, item) => {
      acc[item.name] = {
        label: item.name,
        color: item.fill,
      };
      return acc;
    },
    {} as Record<string, { label: string; color: string }>
  );

  return (
    <div>
      <ChartContainer config={chartConfig} className="mx-auto aspect-square h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value, name) => (
                    <div className="flex items-center justify-between gap-4">
                      <span>{name}</span>
                      <span className="font-mono font-medium">
                        {value} ({((Number(value) / total) * 100).toFixed(1)}%)
                      </span>
                    </div>
                  )}
                />
              }
            />
            <Pie
              data={data}
              dataKey="count"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={2}
              strokeWidth={0}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </ChartContainer>
      {/* Legend */}
      <div className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-2">
        {data.map((item) => (
          <div key={item.name} className="flex items-center gap-1.5 text-xs">
            <div
              className="size-2.5 rounded-sm"
              style={{ backgroundColor: item.fill }}
            />
            <span className="text-muted-foreground">{item.name}</span>
            <span className="font-medium">{item.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}


