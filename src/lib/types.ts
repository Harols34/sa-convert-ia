
import React from "react";

export interface User {
  id: string;
  email: string;
  name?: string;
  full_name?: string;
  role: "superAdmin" | "admin" | "qualityAnalyst" | "supervisor" | "agent";
  avatar?: string;
  avatar_url?: string;
  dailyQueryLimit: number;
  queriesUsed: number;
  language?: 'es' | 'en';
  created_at?: string;
  updated_at?: string;
}

export interface Call {
  id: string;
  title: string;
  filename: string;
  agentName: string;
  agentId?: string | null;
  duration: number;
  date: string;
  status: "pending" | "transcribing" | "analyzing" | "complete" | "error";
  progress: number;
  audio_url: string;
  audioUrl: string;
  transcription?: string | null;
  summary?: string;
  feedback?: Feedback;
  result?: "" | "venta" | "no venta";
  product?: "" | "fijo" | "móvil";
  reason?: string;
  tipificacionId?: string | null;
  speaker_analysis?: any;
  statusSummary?: string; // Field for brief status summary (max 4 words)
}

export interface BehaviorAnalysis {
  name: string;
  evaluation: "cumple" | "no cumple";
  comments: string;
}

export interface Feedback {
  positive: string[];
  negative: string[];
  opportunities: string[];
  score: number;
  behaviors_analysis: BehaviorAnalysis[];
  call_id?: string;
  created_at?: string;
  entities?: string[];
  id?: string;
  sentiment?: string;
  topics?: string[];
  updated_at?: string;
}

export interface Behavior {
  id: string;
  name: string;
  description: string | null;
  prompt: string;
  isActive: boolean;
  criteria?: string[];
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Tipificacion {
  id: string;
  name: string;
  description: string | null;
  type: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface DashboardCard {
  title: string;
  value: string | number;
  change?: number;
  icon?: React.ReactNode;
}

export interface MenuItem {
  name: string;
  href: string;
  icon: React.ReactNode;
  role: User["role"][];
}

export interface ChatMessage {
  id?: string;
  role: "user" | "assistant";
  content: string;
  timestamp?: string;
  call_id?: string;
  user_id?: string;
}

// Interface for ChatHistoryItem
export interface ChatHistoryItem {
  id: string;
  query: string; 
  response: string;
  created_at: string;
  user_id: string;
}
