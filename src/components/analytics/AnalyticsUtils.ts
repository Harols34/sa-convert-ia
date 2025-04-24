
import { Call } from "@/lib/types";

export interface CallVolumeData {
  name: string;
  calls: number;
}

export interface AgentPerformanceData {
  name: string;
  score: number;
  calls: number;
}

export interface IssueTypeData {
  name: string;
  value: number;
}

export interface ResultsData {
  name: string;
  value: number;
}

export interface PerformanceMetric {
  metric: string;
  current: string | number;
  previous: string | number;
  change: number;
}

export const emptyCallVolumeData: CallVolumeData[] = [
  { name: 'Lun', calls: 0 },
  { name: 'Mar', calls: 0 },
  { name: 'Mié', calls: 0 },
  { name: 'Jue', calls: 0 },
  { name: 'Vie', calls: 0 },
  { name: 'Sáb', calls: 0 },
  { name: 'Dom', calls: 0 },
];

export const emptyAgentPerformanceData: AgentPerformanceData[] = [
  { name: 'Agente 1', score: 0, calls: 0 },
  { name: 'Agente 2', score: 0, calls: 0 },
  { name: 'Agente 3', score: 0, calls: 0 },
];

export const emptyIssueTypeData: IssueTypeData[] = [
  { name: 'No hay datos', value: 1 },
];

export const emptyResultsData: ResultsData[] = [
  { name: 'Venta', value: 0 },
  { name: 'No Venta', value: 0 },
];

export const COLORS = [
  '#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#0088FE', 
  '#00C49F', '#FFBB28', '#FF8042', '#a4de6c', '#d0ed57'
];

export const categorizeIssue = (issue: string): string => {
  const issueMap: Record<string, string[]> = {
    "Precio": ["precio", "costo", "tarifa", "descuento", "oferta", "promoción"],
    "Producto": ["producto", "servicio", "calidad", "características", "funcionalidad"],
    "Atención": ["atención", "servicio", "agente", "asistencia", "ayuda", "soporte"],
    "Tiempo": ["demora", "espera", "tardanza", "lento", "rápido", "tiempo"],
    "Técnico": ["técnico", "error", "falla", "problema", "tecnología"]
  };

  const lowerIssue = issue.toLowerCase();
  for (const [category, keywords] of Object.entries(issueMap)) {
    if (keywords.some(keyword => lowerIssue.includes(keyword))) {
      return category;
    }
  }

  return "Otros";
};

export const generatePerformanceMetrics = (
  callsData: any[], 
  feedbackData: any[]
): PerformanceMetric[] => {
  // Generate sample performance metrics
  const metrics: PerformanceMetric[] = [
    {
      metric: "Satisfacción de Cliente",
      current: "85%",
      previous: "82%",
      change: 3
    },
    {
      metric: "Tiempo Promedio de Llamada",
      current: "4m 30s",
      previous: "4m 45s",
      change: -5
    },
    {
      metric: "Tasa de Conversión",
      current: "32%",
      previous: "30%",
      change: 2
    },
    {
      metric: "Retención de Clientes",
      current: "78%",
      previous: "75%",
      change: 3
    },
    {
      metric: "Resolución en Primera Llamada",
      current: "65%",
      previous: "62%",
      change: 3
    }
  ];

  return metrics;
};
