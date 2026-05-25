export type Page = "new" | "insights" | "history" | "chat";

export type Session = {
  id: number;
  initial_moya: string;
  summary: string | null;
  created_at: string;
  closed_at: string | null;
};

export type Message = {
  id: number;
  session_id: number;
  role: "user" | "assistant";
  content: string;
  created_at: string;
};
