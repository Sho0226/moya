import { useState, type FormEvent, type KeyboardEvent, type ChangeEvent } from "react";

type FilterPeriod = "all" | "thisMonth" | "lastMonth" | "3months";
const FILTER_LABELS: Record<FilterPeriod, string> = { all: "すべて", thisMonth: "今月", lastMonth: "先月", "3months": "3ヶ月" };

function applyPeriodFilter<T>(items: T[], period: FilterPeriod, getDate: (item: T) => string): T[] {
  if (period === "all") return items;
  const now = new Date();
  return items.filter((item) => {
    const d = new Date(getDate(item));
    if (period === "thisMonth") return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    if (period === "lastMonth") { const m = now.getMonth() === 0 ? 11 : now.getMonth() - 1; const y = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear(); return d.getFullYear() === y && d.getMonth() === m; }
    if (period === "3months") return d >= new Date(now.getFullYear(), now.getMonth() - 2, 1);
    return true;
  });
}
import styles from "./App.module.css";
import { ChatView } from "./components/ChatView";
import { ReportPage } from "./components/ReportPage";
import { RoadmapPage } from "./components/RoadmapPage";
import { useSessions } from "./hooks/useSessions";
import { useChat } from "./hooks/useChat";
import type { Page } from "./types";

const autoResize = (e: ChangeEvent<HTMLTextAreaElement>) => {
  const el = e.target;
  el.style.height = "auto";
  el.style.height = `${el.scrollHeight}px`;
};

export default function App() {
  const [page, setPage] = useState<Page>("new");
  const [newMoya, setNewMoya] = useState("");
  const [creating, setCreating] = useState(false);
  const [filterInsights, setFilterInsights] = useState<FilterPeriod>("all");

  const { sessions, refresh, deleteSession } = useSessions();
  const chat = useChat();

  const navigate = (to: Exclude<Page, "chat">) => {
    setPage(to);
    refresh();
  };

  const handleStart = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!newMoya.trim()) return;
    setCreating(true);
    try {
      await chat.start(newMoya);
      setNewMoya("");
      setPage("chat");
    } finally {
      setCreating(false);
    }
  };

  const handleBack = async () => {
    chat.exit();
    await refresh();
    setPage("new");
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.currentTarget.form?.requestSubmit();
    }
  };

  if (page === "chat" && chat.activeSession) {
    return (
      <ChatView
        session={chat.activeSession}
        messages={chat.messages}
        loading={chat.loading}
        onBack={handleBack}
        onSend={chat.send}
        onClose={chat.close}
      />
    );
  }

  const completed  = sessions.filter((s) => s.closed_at);
  const inProgress = sessions.filter((s) => !s.closed_at);

  return (
    <div className={styles.layout}>
      <header className={styles.appHeader}>
        <span className={styles.logo}>moya</span>
        <nav className={styles.nav}>
          <button className={`${styles.navBtn} ${page === "new"      ? styles.navActive : ""}`} onClick={() => navigate("new")}>記録する</button>
          <button className={`${styles.navBtn} ${page === "insights" ? styles.navActive : ""}`} onClick={() => navigate("insights")}>気づきの記録</button>
          <button className={`${styles.navBtn} ${page === "history"  ? styles.navActive : ""}`} onClick={() => navigate("history")}>履歴</button>
          <button className={`${styles.navBtn} ${page === "report"   ? styles.navActive : ""}`} onClick={() => navigate("report")}>日報</button>
          <button className={`${styles.navBtn} ${page === "roadmap"  ? styles.navActive : ""}`} onClick={() => navigate("roadmap")}>ロードマップ</button>
        </nav>
      </header>

      <main className={styles.main}>

        {page === "new" && (
          <div className={styles.newPage}>
            <form onSubmit={handleStart} className={styles.form}>
              <label htmlFor="moya" className={styles.formPrompt}>いま、何にモヤモヤしてる？</label>
              <textarea
                id="moya"
                value={newMoya}
                onChange={(e) => { setNewMoya(e.target.value); autoResize(e); }}
                onKeyDown={handleKeyDown}
                placeholder="起きたこと、感じたこと、なんでも..."
                rows={3}
                required
                className={styles.formTextarea}
              />
              <button type="submit" className={styles.submitBtn} disabled={creating}>
                {creating ? "はじめています..." : "掘り下げてみる →"}
              </button>
            </form>
          </div>
        )}

        {page === "insights" && (
          <div className={styles.listPage}>
            <div className={styles.filterBar}>
              {(Object.keys(FILTER_LABELS) as FilterPeriod[]).map((p) => (
                <button key={p} className={`${styles.filterChip} ${filterInsights === p ? styles.filterChipActive : ""}`} onClick={() => setFilterInsights(p)}>
                  {FILTER_LABELS[p]}
                </button>
              ))}
            </div>
            {completed.length === 0 ? (
              <div className={styles.emptyState}>
                <p>まだ完了したセッションがありません。</p>
                <p>モヤモヤを掘り下げて「腑に落ちた」を押すと、ここに記録されます。</p>
              </div>
            ) : applyPeriodFilter(completed, filterInsights, (s) => s.created_at).length === 0 ? (
              <div className={styles.emptyState}><p>この期間の記録はありません。</p></div>
            ) : (
              <ul className={styles.logList}>
                {applyPeriodFilter(completed, filterInsights, (s) => s.created_at).map((session) => {
                  const insights = session.summary
                    ? session.summary.split("\n").map((l) => l.replace(/^[•\-・]\s*/, "").replace(/\*\*/g, "").trim()).filter(Boolean)
                    : [];
                  return (
                    <li key={session.id} className={styles.logItem} onClick={() => { chat.open(session); setPage("chat"); }}>
                      <div className={styles.logHeader}>
                        <p className={styles.logMoya}>{session.initial_moya}</p>
                        <time className={styles.logTime}>
                          {new Date(session.created_at).toLocaleDateString("ja-JP", { month: "numeric", day: "numeric", weekday: "short" })}
                        </time>
                        <button
                          className={styles.deleteBtn}
                          onClick={(e) => { e.stopPropagation(); if (window.confirm("この記録を削除しますか？")) deleteSession(session.id); }}
                        >×</button>
                      </div>
                      {insights.length > 0 && (
                        <ul className={styles.insightList}>
                          {insights.map((insight, i) => (
                            <li key={i} className={styles.insightItem}>{insight}</li>
                          ))}
                        </ul>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}

        {page === "history" && (
          <div className={styles.listPage}>
            {inProgress.length === 0 ? (
              <div className={styles.emptyState}>
                <p>進行中のセッションはありません。</p>
              </div>
            ) : (
              <ul className={styles.historyList}>
                {inProgress.map((session) => (
                  <li key={session.id} className={styles.historyItem} onClick={() => { chat.open(session); setPage("chat"); }}>
                    <p className={styles.historyMoya}>{session.initial_moya}</p>
                    <time className={styles.logTime}>
                      {new Date(session.created_at).toLocaleDateString("ja-JP", { month: "numeric", day: "numeric", weekday: "short" })}
                    </time>
                    <button
                      className={styles.deleteBtn}
                      onClick={(e) => { e.stopPropagation(); if (window.confirm("この記録を削除しますか？")) deleteSession(session.id); }}
                    >×</button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {page === "report"   && <ReportPage />}
        {page === "roadmap"  && <RoadmapPage />}

      </main>
    </div>
  );
}
