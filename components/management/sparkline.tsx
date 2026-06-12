"use client";

import { useId } from "react";
import { AreaChart, Area, ResponsiveContainer } from "recharts";
import type { SparklinePoint } from "@/lib/product-sales-data";

interface SparklineProps {
  data: SparklinePoint[];
  trend: "up" | "down";
}

export function Sparkline({ data, trend }: SparklineProps) {
  const color = trend === "up" ? "#10b981" : "#ef4444"; // emerald-500 and red-500
  const gradientId = useId();

  return (
    <div className="w-24 h-10">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.1} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={1.5}
            fill={`url(#${gradientId})`}
            dot={false}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
