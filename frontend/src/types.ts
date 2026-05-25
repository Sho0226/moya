export type Page = "new" | "insights" | "history" | "chat" | "report";

export type Session = {
  id: number;
  initial_moya: string;
  summary: string | null;
  created_at: string;
  closed_at: string | null;
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
