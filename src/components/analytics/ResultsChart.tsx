
import React from "react";
import { Card } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { ResultsData, COLORS } from "./AnalyticsUtils";

interface ResultsChartProps {
  data: ResultsData[];
  isLoading: boolean;
  hasData: boolean;
}

export default function ResultsChart({ data, isLoading, hasData }: ResultsChartProps) {
  if (isLoading) {
    return (
      <Card className="glass-card dark:glass-card-dark p-6 animate-slide-in-bottom" style={{ animationDelay: "0.2s" }}>
        <h3 className="text-lg font-medium mb-4">Resultados de Ventas</h3>
        <div className="flex items-center justify-center h-[300px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </Card>
    );
  }

  if (!hasData) {
    return (
      <Card className="glass-card dark:glass-card-dark p-6 animate-slide-in-bottom" style={{ animationDelay: "0.2s" }}>
        <h3 className="text-lg font-medium mb-4">Resultados de Ventas</h3>
        <div className="flex items-center justify-center h-[300px]">
          <p className="text-muted-foreground">No hay datos disponibles</p>
        </div>
      </Card>
    );
  }

  const totalValue = data.reduce((sum, item) => sum + item.value, 0);
  
  return (
    <Card className="glass-card dark:glass-card-dark p-6 animate-slide-in-bottom" style={{ animationDelay: "0.2s" }}>
      <h3 className="text-lg font-medium mb-4">Resultados de Ventas</h3>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
            label={({ name, value }) => `${name}: ${((value / totalValue) * 100).toFixed(1)}%`}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(value) => [`${value} llamadas`, 'Cantidad']} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </Card>
  );
}
