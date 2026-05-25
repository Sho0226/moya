import { useState, useEffect } from "react";
import type { DailyReport } from "../types";

const API = import.meta.env.VITE_API_URL ?? "http://localhost:8080";

export function useReports() {
  const [reports, setReports] = useState<DailyReport[]>([]);

  const refresh = async () => {
    const res = await fetch(`${API}/reports`);
    const data: DailyReport[] = await res.json();
    setReports(data);
  };

  const submit = async (
    progress: string,
    improvements: string,
    tomorrow: string
  ): Promise<DailyReport> => {
    const res = await fetch(`${API}/reports`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ progress, improvements, tomorrow }),
    });
    const data: DailyReport = await res.json();
    setReports((prev) => [data, ...prev]);
    return data;
  };

  useEffect(() => { refresh(); }, []);

  return { reports, submit };
}
