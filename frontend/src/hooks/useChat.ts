import { useState } from "react";
import type { Session, Message } from "../types";

const API = import.meta.env.VITE_API_URL ?? "http://localhost:8080";

export function useChat() {
  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);

  const start = async (moya: string) => {
    const res = await fetch(`${API}/sessions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ moya }),
    });
    const data = await res.json();
    await open({ id: data.session_id } as Session);
  };

  const open = async (session: Session) => {
    const res = await fetch(`${API}/sessions/${session.id}`);
    const data = await res.json();
    setActiveSession(data.session);
    setMessages(data.messages);
  };

  const send = async (text: string) => {
    const sessionId = activeSession?.id;
    if (!sessionId || loading) return;

    setMessages((prev) => [
      ...prev,
      { id: Date.now(), session_id: sessionId, role: "user", content: text, created_at: new Date().toISOString() },
    ]);
    setLoading(true);
    try {
      const res = await fetch(`${API}/sessions/${sessionId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        { id: Date.now() + 1, session_id: sessionId, role: "assistant", content: data.ai_reply, created_at: new Date().toISOString() },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const close = async () => {
    const sessionId = activeSession?.id;
    if (!sessionId) return;

    setActiveSession((prev) => prev ? { ...prev, closed_at: new Date().toISOString() } : null);
    setLoading(true);
    try {
      const res = await fetch(`${API}/sessions/${sessionId}/close`, { method: "POST" });
      const data = await res.json();
      if (data.closing_message) {
        setMessages((prev) => [
          ...prev,
          { id: Date.now(), session_id: sessionId, role: "assistant", content: data.closing_message, created_at: new Date().toISOString() },
        ]);
      }
      if (data.summary) {
        setActiveSession((prev) => prev ? { ...prev, summary: data.summary } : null);
      }
    } catch {
      // クローズ済みのまま続行
    } finally {
      setLoading(false);
    }
  };

  const exit = () => {
    setActiveSession(null);
    setMessages([]);
  };

  return { activeSession, messages, loading, start, open, send, close, exit };
}
