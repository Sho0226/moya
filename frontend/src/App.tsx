import { useState, type FormEvent, type KeyboardEvent, type ChangeEvent } from "react";
import styles from "./App.module.css";
import { ChatView } from "./components/ChatView";
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

  const { sessions, refresh } = useSessions();
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
            {completed.length === 0 ? (
              <div className={styles.emptyState}>
                <p>まだ完了したセッションがありません。</p>
                <p>モヤモヤを掘り下げて「腑に落ちた」を押すと、ここに記録されます。</p>
              </div>
            ) : (
              <ul className={styles.logList}>
                {completed.map((session) => {
                  const insights = session.summary
                    ? session.summary.split("\n").map((l) => l.replace(/^[•\-・]\s*/, "").trim()).filter(Boolean)
                    : [];
                  return (
                    <li key={session.id} className={styles.logItem} onClick={() => { chat.open(session); setPage("chat"); }}>
                      <div className={styles.logHeader}>
                        <p className={styles.logMoya}>{session.initial_moya}</p>
                        <time className={styles.logTime}>
                          {new Date(session.created_at).toLocaleDateString("ja-JP", { month: "numeric", day: "numeric", weekday: "short" })}
                        </time>
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
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

      </main>
    </div>
  );
}
