import { useState } from "react";
import styles from "../App.module.css";
import type { RoadmapType } from "../types";
import { useRoadmap } from "../hooks/useRoadmap";

const TABS: { type: RoadmapType; label: string; desc: string }[] = [
  { type: "moya",   label: "心境の変化",  desc: "モヤモヤの記録から、内面・気持ちの変化を辿る" },
  { type: "report", label: "学びの軌跡",  desc: "日報の記録から、スキル・キャリアの進展を辿る" },
];

type TimelineEntry = {
  period: string;
  title: string;
  detail: string;
  type: string;
};

type RoadmapData = {
  summary: string;
  timeline: TimelineEntry[];
};

const TYPE_LABEL: Record<string, string> = {
  insight:       "気づき",
  turning_point: "転換点",
  struggle:      "葛藤",
  learning:      "学び",
  milestone:     "達成",
  challenge:     "課題",
};

function parseRoadmap(content: string): RoadmapData | null {
  try {
    const data = JSON.parse(content);
    if (data?.timeline) return data as RoadmapData;
    return null;
  } catch {
    return null;
  }
}

export function RoadmapPage() {
  const [activeTab, setActiveTab] = useState<RoadmapType>("moya");
  const { moya, report, generating, generate } = useRoadmap();

  const roadmap = activeTab === "moya" ? moya : report;
  const tab     = TABS.find((t) => t.type === activeTab)!;
  const data    = roadmap ? parseRoadmap(roadmap.content) : null;

  return (
    <div className={styles.listPage}>

      <div className={styles.roadmapTabs}>
        {TABS.map((t) => (
          <button
            key={t.type}
            className={`${styles.roadmapTab} ${activeTab === t.type ? styles.roadmapTabActive : ""}`}
            onClick={() => setActiveTab(t.type)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <p className={styles.roadmapDesc}>{tab.desc}</p>

      {data ? (
        <>
          <div className={styles.roadmapMeta}>
            <time className={styles.logTime}>
              最終生成：{new Date(roadmap!.created_at).toLocaleDateString("ja-JP", { year: "numeric", month: "numeric", day: "numeric" })}
            </time>
            <button className={styles.roadmapRegenBtn} onClick={() => generate(activeTab)} disabled={generating}>
              {generating ? "生成中..." : "再生成する"}
            </button>
          </div>

          {data.summary && (
            <p className={styles.roadmapSummary}>{data.summary}</p>
          )}

          <div className={styles.timeline}>
            {data.timeline.map((entry, i) => (
              <div key={i} className={`${styles.timelineEntry} ${styles[`tl_${entry.type}`] ?? ""}`}>
                <div className={styles.timelineDot} />
                <div className={styles.timelineCard}>
                  <div className={styles.timelineCardHeader}>
                    <time className={styles.timelinePeriod}>{entry.period}</time>
                    {TYPE_LABEL[entry.type] && (
                      <span className={`${styles.timelineTag} ${styles[`tag_${entry.type}`] ?? ""}`}>
                        {TYPE_LABEL[entry.type]}
                      </span>
                    )}
                  </div>
                  <h3 className={styles.timelineTitle}>{entry.title}</h3>
                  <p className={styles.timelineDetail}>{entry.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className={styles.roadmapEmpty}>
          <p>まだロードマップが生成されていません。</p>
          <button className={styles.submitBtn} onClick={() => generate(activeTab)} disabled={generating}>
            {generating ? "生成中..." : "ロードマップを生成する →"}
          </button>
        </div>
      )}

    </div>
  );
}
