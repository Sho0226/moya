import { useState, useEffect, type FormEvent } from "react";
import styles from "./App.module.css";

const API = "http://localhost:8080";

type Log = {
  id: number;
  content: string;
  hypothesis: string;
  created_at: string;
};

function App() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [content, setContent] = useState("");
  const [hypothesis, setHypothesis] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = async () => {
    const res = await fetch(API);
    const data: Log[] = await res.json();
    setLogs(data);
  };

  useEffect(() => {
    fetch(API)
      .then((res) => res.json())
      .then((data: Log[]) => setLogs(data))
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!content.trim() || !hypothesis.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, hypothesis }),
      });
      if (!res.ok) throw new Error("保存に失敗しました");
      setContent("");
      setHypothesis("");
      await fetchLogs();
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <h1>moya</h1>
        <p>モヤモヤを記録して、前提を問い直す</p>
      </header>

      <section className={styles.formSection}>
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label htmlFor="content">起きたこと / モヤモヤ</label>
            <textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="何が起きた？どんな気持ちになった？"
              rows={3}
              required
            />
          </div>
          <div className={styles.field}>
            <label htmlFor="hypothesis">前提・仮説</label>
            <textarea
              id="hypothesis"
              value={hypothesis}
              onChange={(e) => setHypothesis(e.target.value)}
              placeholder="そのとき、あなたが信じていた前提や仮説は？"
              rows={3}
              required
            />
          </div>
          {error && <p className={styles.error}>{error}</p>}
          <button
            type="submit"
            className={styles.submitBtn}
            disabled={submitting}
          >
            {submitting ? "保存中..." : "記録する"}
          </button>
        </form>
      </section>

      <section className={styles.logSection}>
        <h2>記録一覧</h2>
        {logs.length === 0 ? (
          <p className={styles.empty}>まだ記録がありません</p>
        ) : (
          <ul className={styles.logList}>
            {logs.map((log) => (
              <li key={log.id} className={styles.logItem}>
                <div className={styles.logRow}>
                  <div className={styles.logBlock}>
                    <span className={styles.logLabel}>モヤモヤ</span>
                    <p>{log.content}</p>
                  </div>
                  <div className={styles.logBlock}>
                    <span className={styles.logLabel}>前提・仮説</span>
                    <p>{log.hypothesis}</p>
                  </div>
                </div>
                <time className={styles.logTime}>
                  {new Date(log.created_at).toLocaleString("ja-JP")}
                </time>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

export default App;
