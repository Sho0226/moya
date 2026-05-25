import { useState, type FormEvent, type ChangeEvent } from "react";
import styles from "../App.module.css";
import type { DailyReport } from "../types";
import { useReports } from "../hooks/useReports";

const autoResize = (e: ChangeEvent<HTMLTextAreaElement>) => {
  const el = e.target;
  el.style.height = "auto";
  el.style.height = `${el.scrollHeight}px`;
};

const FIELDS = [
  {
    key: "progress" as const,
    label: "前進したこと・学んだこと・気づき",
    placeholder: "今日、何が動いた？何に気づいた？",
  },
  {
    key: "improvements" as const,
    label: "改善点（Fight ポイント）",
    placeholder: "行動や考え方で変えていくこと...",
  },
  {
    key: "tomorrow" as const,
    label: "明日への期待",
    placeholder: "「〜する」の形で書く",
  },
];

export function ReportPage() {
  const { reports, submit } = useReports();
  const [values, setValues] = useState({ progress: "", improvements: "", tomorrow: "" });
  const [submitting, setSubmitting] = useState(false);
  const [latest, setLatest] = useState<DailyReport | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const report = await submit(values.progress, values.improvements, values.tomorrow);
      setLatest(report);
      setValues({ progress: "", improvements: "", tomorrow: "" });
    } finally {
      setSubmitting(false);
    }
  };

  const past = latest ? reports.filter((r) => r.id !== latest.id) : reports;

  return (
    <div className={styles.listPage}>

      {latest ? (
        <div className={styles.reportFeedbackWrap}>
          <p className={styles.summaryLabel}>AIからのフィードバック</p>
          <div className={styles.summaryContent}>{latest.ai_feedback}</div>
          <button className={styles.reportNextBtn} onClick={() => setLatest(null)}>
            次の日報を書く
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className={styles.reportForm}>
          {FIELDS.map(({ key, label, placeholder }) => (
            <div key={key} className={styles.reportField}>
              <label className={styles.reportFieldLabel}>{label}</label>
              <textarea
                value={values[key]}
                onChange={(e) => { setValues((v) => ({ ...v, [key]: e.target.value })); autoResize(e); }}
                placeholder={placeholder}
                rows={2}
                required
                disabled={submitting}
                className={styles.formTextarea}
              />
            </div>
          ))}
          <button type="submit" disabled={submitting} className={styles.submitBtn}>
            {submitting ? "送信中..." : "記録して振り返る →"}
          </button>
        </form>
      )}

      {past.length > 0 && (
        <ul className={styles.reportList}>
          {past.map((r) => (
            <li key={r.id} className={styles.reportItem}>
              <time className={styles.reportItemDate}>
                {new Date(r.report_date).toLocaleDateString("ja-JP", { month: "numeric", day: "numeric", weekday: "short" })}
              </time>
              <div className={styles.reportItemSections}>
                {FIELDS.map(({ key, label }) => (
                  <div key={key} className={styles.reportItemSection}>
                    <span className={styles.reportItemSectionLabel}>{label}</span>
                    <p className={styles.reportItemText}>{r[key]}</p>
                  </div>
                ))}
              </div>
              {r.ai_feedback && (
                <div className={styles.reportItemFeedback}>{r.ai_feedback}</div>
              )}
            </li>
          ))}
        </ul>
      )}

    </div>
  );
}
