
import { ChevronDown, ChevronUp } from "lucide-react";

export interface ResultsData {
  name: string;
  value: number;
  color: string;
}

export const COLORS = [
  "#2563eb", // Blue
  "#dc2626", // Red
  "#16a34a", // Green
  "#ca8a04", // Yellow
  "#9333ea", // Purple
  "#0891b2", // Cyan
  "#c2410c", // Orange
];

export const prepareResultsData = (calls: any[]) => {
  const results = calls.reduce((acc: Record<string, number>, call) => {
    const result = call.result || "Sin resultado";
    acc[result] = (acc[result] || 0) + 1;
    return acc;
  }, {});

  return Object.entries(results).map(([name, value], index) => ({
    name,
    value,
    color: COLORS[index % COLORS.length],
  }));
};

export const formatDate = (date: string | Date) => {
  return new Date(date).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

export const formatTime = (seconds: number) => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds < 10 ? "0" : ""}${remainingSeconds}`;
};

export const formatPercentChange = (current: number, previous: number) => {
  if (previous === 0) return current > 0 ? 100 : 0;
  const percentChange = ((current - previous) / previous) * 100;
  return Math.round(percentChange);
};

export const getChangeIcon = (change: number) => {
  return change > 0 ? ChevronUp : change < 0 ? ChevronDown : null;
};

export const getChangeColor = (change: number) => {
  return change > 0 ? "text-green-500" : change < 0 ? "text-red-500" : "text-gray-500";
};
