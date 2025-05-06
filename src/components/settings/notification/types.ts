
export interface DailyReport {
  date: string;
  callCount: number;
  averageScore: number;
  trend: "up" | "down" | "stable";
  issuesCount: number;
  issues: string[];
  agents: {
    id: string;
    name: string;
    callCount: number;
    averageScore: number;
  }[];
  findings: {
    positive: string[];
    negative: string[];
  };
  topFindings: {
    positive: string[];
    negative: string[];
    opportunities: string[];
  };
  // New AI-generated insights
  aiInsights?: {
    summary: string;
    recommendations: string[];
  };
}
