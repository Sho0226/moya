import { useState, useEffect } from "react";
import type { Session } from "../types";

const API = import.meta.env.VITE_API_URL ?? "http://localhost:8080";

export function useSessions() {
  const [sessions, setSessions] = useState<Session[]>([]);

  const refresh = async () => {
    const res = await fetch(`${API}/sessions`);
    const data: Session[] = await res.json();
    setSessions(data);
  };

  const deleteSession = async (id: number) => {
    await fetch(`${API}/sessions/${id}`, { method: "DELETE" });
    setSessions((prev) => prev.filter((s) => s.id !== id));
  };

  useEffect(() => { refresh(); }, []);

  return { sessions, refresh, deleteSession };
}
