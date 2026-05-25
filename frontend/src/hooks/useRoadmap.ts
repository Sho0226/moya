import { useState, useEffect } from "react";
import type { Roadmap, RoadmapType } from "../types";

const API = import.meta.env.VITE_API_URL ?? "http://localhost:8080";

export function useRoadmap() {
  const [moya, setMoya] = useState<Roadmap | null>(null);
  const [report, setReport] = useState<Roadmap | null>(null);
  const [generating, setGenerating] = useState(false);

  const fetchLatest = async (type: RoadmapType) => {
    const res = await fetch(`${API}/roadmaps?type=${type}`);
    const data = await res.json();
    if (type === "moya") setMoya(data);
    else setReport(data);
  };

  const generate = async (type: RoadmapType) => {
    setGenerating(true);
    try {
      const res = await fetch(`${API}/roadmaps`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });
      const data: Roadmap = await res.json();
      if (type === "moya") setMoya(data);
      else setReport(data);
    } finally {
      setGenerating(false);
    }
  };

  useEffect(() => {
    fetchLatest("moya");
    fetchLatest("report");
  }, []);

  return { moya, report, generating, generate };
}
