export type Page = "new" | "insights" | "history" | "chat" | "report" | "roadmap";

export type Session = {
  id: number;
  initial_moya: string;
  summary: string | null;
  created_at: string;
  closed_at: string | null;
};

export type RoadmapType = "moya" | "report";

export type Roadmap = {
  id: number;
  type: RoadmapType;
  content: string;
  created_at: string;
};

export type DailyReport = {
  id: number;
  progress: string;
  improvements: string;
  tomorrow: string;
  ai_feedback: string | null;
  report_date: string;
  created_at: string;
};

export type Message = {
  id: number;
  session_id: number;
  role: "user" | "assistant";
  content: string;
  created_at: string;
};
