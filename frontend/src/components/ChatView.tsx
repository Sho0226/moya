import { useRef, useEffect, useState, type FormEvent, type KeyboardEvent, type ChangeEvent } from "react";
import styles from "../App.module.css";
import type { Session, Message } from "../types";

type Props = {
  session: Session;
  messages: Message[];
  loading: boolean;
  onBack: () => void;
  onSend: (text: string) => Promise<void>;
  onClose: () => Promise<void>;
};

const autoResize = (e: ChangeEvent<HTMLTextAreaElement>) => {
  const el = e.target;
  el.style.height = "auto";
  el.style.height = `${el.scrollHeight}px`;
};

export function ChatView({ session, messages, loading, onBack, onSend, onClose }: Props) {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const isClosed = !!session.closed_at;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (!loading) inputRef.current?.focus();
  }, [loading]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim() || loading) return;
    const text = input.trim();
    setInput("");
    if (inputRef.current) inputRef.current.style.height = "auto";
    await onSend(text);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.currentTarget.form?.requestSubmit();
    }
  };

  return (
    <div className={styles.layout}>
      <header className={styles.chatHeader}>
        <button onClick={onBack} className={styles.backBtn}>← 戻る</button>
        <span className={styles.chatContext}>{session.initial_moya}</span>
        {isClosed && <span className={styles.closedBadge}>完了</span>}
      </header>

      <div className={styles.messages}>
        {messages.map((msg) => (
          <div key={msg.id} className={msg.role === "user" ? styles.userMsg : styles.aiMsg}>
            {msg.content}
          </div>
        ))}
        {loading && (
          <div className={styles.aiMsg}>
            <span className={styles.typing}><span /><span /><span /></span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {isClosed && session.summary && (
        <div className={styles.summaryWrap}>
          <p className={styles.summaryLabel}>あなたが持っていた前提</p>
          <div className={styles.summaryContent}>{session.summary}</div>
        </div>
      )}

      {!isClosed && (
        <div className={styles.chatBottom}>
          <button onClick={onClose} className={styles.closeBtnBottom} disabled={loading}>
            腑に落ちた
          </button>
          <form onSubmit={handleSubmit} className={styles.chatForm}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => { setInput(e.target.value); autoResize(e); }}
              onKeyDown={handleKeyDown}
              placeholder="答える...（Cmd+Enter で送信）"
              rows={1}
              disabled={loading}
              className={styles.chatInput}
            />
            <button type="submit" disabled={loading || !input.trim()} className={styles.sendBtn}>
              送信
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
