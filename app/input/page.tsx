"use client";

import { useEffect, useMemo, useState } from "react";

type MemoItem = {
  id: string;
  savedAt: string;
  dateKey: string;
  category: string;
  content: string;
  syncStatus: "unsent" | "sent";
};

const STORAGE_KEY = "reflection_memo_queue";

const categories = [
  "今日あったこと",
  "今日の気づき",
  "明日の一歩",
  "その他",
];

function formatDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;
}

function formatSavedAt(date: Date) {
  return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, "0")}/${String(
    date.getDate()
  ).padStart(2, "0")} ${String(date.getHours()).padStart(2, "0")}:${String(
    date.getMinutes()
  ).padStart(2, "0")}`;
}

function formatDateLabel(dateKey: string) {
  const [y, m, d] = dateKey.split("-");
  return `${y}/${m}/${d}`;
}

export default function InputPage() {
  const todayKey = formatDateKey(new Date());

  const [category, setCategory] = useState("今日あったこと");
  const [content, setContent] = useState("");
  const [memoList, setMemoList] = useState<MemoItem[]>([]);
  const [selectedDateKey, setSelectedDateKey] = useState(todayKey);
  const [message, setMessage] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);
  const [isReviewing, setIsReviewing] = useState(false);
  const [dailyComment, setDailyComment] = useState("");

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return;

    try {
      const parsed: MemoItem[] = JSON.parse(stored);
      setMemoList(parsed);

      if (parsed.length > 0) {
        setSelectedDateKey(parsed[0].dateKey);
      }
    } catch (error) {
      console.error(error);
    }
  }, []);

  const filteredList = useMemo(() => {
    return memoList.filter((item) => item.dateKey === selectedDateKey);
  }, [memoList, selectedDateKey]);

  const unsentCount = useMemo(() => {
    return memoList.filter((item) => item.syncStatus === "unsent").length;
  }, [memoList]);

  const groupedDates = useMemo(() => {
    const uniqueDates = Array.from(new Set(memoList.map((item) => item.dateKey)));
    return uniqueDates.sort((a, b) => (a < b ? 1 : -1));
  }, [memoList]);

  const handleAddMemo = () => {
    setMessage("");

    if (!content.trim()) {
      setMessage("内容を入力してください。");
      return;
    }

    const now = new Date();

    const newItem: MemoItem = {
      id: crypto.randomUUID(),
      savedAt: formatSavedAt(now),
      dateKey: formatDateKey(now),
      category,
      content: content.trim(),
      syncStatus: "unsent",
    };

    const newList = [newItem, ...memoList];
    setMemoList(newList);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newList));

    setSelectedDateKey(newItem.dateKey);
    setContent("");
    setMessage("メモを追加しました。");
  };

  const handleSync = async () => {
    setMessage("");

    const unsentItems = memoList.filter((item) => item.syncStatus === "unsent");

    if (unsentItems.length === 0) {
      setMessage("未送信メモはありません。");
      return;
    }

    setIsSyncing(true);

    try {
      const updatedList = [...memoList];

      for (const item of unsentItems) {
        const res = await fetch("/api/sync-memo", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(item),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data?.message || "同期に失敗しました。");
        }

        const targetIndex = updatedList.findIndex((memo) => memo.id === item.id);
        if (targetIndex >= 0) {
          updatedList[targetIndex] = {
            ...updatedList[targetIndex],
            syncStatus: "sent",
          };
        }
      }

      setMemoList(updatedList);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedList));
      setMessage(`${unsentItems.length}件を同期しました。`);
    } catch (error) {
      console.error(error);
      setMessage("同期中にエラーが発生しました。");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDailyReview = async () => {
    setMessage("");
    setDailyComment("");

    if (filteredList.length === 0) {
      setMessage("この日のメモがありません。");
      return;
    }

    setIsReviewing(true);

    try {
      const res = await fetch("/api/daily-comment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          dateKey: selectedDateKey,
          memos: filteredList,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.message || "日次AIコメントの生成に失敗しました。");
      }

      setDailyComment(data.comment || "");
      setMessage("日次AIコメントを作成して保存しました。");
    } catch (error) {
      console.error(error);
      setMessage("日次AIコメントの生成中にエラーが発生しました。");
    } finally {
      setIsReviewing(false);
    }
  };

  const handleClearAll = () => {
    localStorage.removeItem(STORAGE_KEY);
    setMemoList([]);
    setSelectedDateKey(todayKey);
    setContent("");
    setMessage("");
    setDailyComment("");
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "16px 12px 32px",
        fontFamily: "sans-serif",
        background: "#f7f7f7",
      }}
    >
      <div
        style={{
          maxWidth: "720px",
          margin: "0 auto",
          display: "grid",
          gap: "16px",
        }}
      >
        <section
          style={{
            background: "white",
            padding: "18px",
            borderRadius: "16px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
          }}
        >
          <h1 style={{ fontSize: "28px", marginBottom: "8px" }}>メモ入力</h1>
          <p style={{ color: "#666", marginBottom: "18px", lineHeight: 1.6 }}>
            その瞬間の気づきを、1件ずつためます
          </p>

          <div style={{ marginBottom: "14px" }}>
            <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold" }}>
              区分
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              style={{
                width: "100%",
                padding: "14px 12px",
                fontSize: "16px",
                borderRadius: "10px",
                border: "1px solid #ccc",
                background: "white",
              }}
            >
              {categories.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: "16px" }}>
            <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold" }}>
              内容
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              style={{
                width: "100%",
                minHeight: "140px",
                padding: "14px 12px",
                fontSize: "16px",
                lineHeight: 1.6,
                borderRadius: "10px",
                border: "1px solid #ccc",
                boxSizing: "border-box",
              }}
              placeholder="思いついたことを1件ずつ書いてください"
            />
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr",
              gap: "10px",
            }}
          >
            <button
              onClick={handleAddMemo}
              style={{
                padding: "16px",
                fontSize: "18px",
                fontWeight: "bold",
                background: "#2563eb",
                color: "white",
                border: "none",
                borderRadius: "12px",
                cursor: "pointer",
              }}
            >
              追加保存する
            </button>

            <button
              onClick={handleSync}
              disabled={isSyncing}
              style={{
                padding: "16px",
                fontSize: "18px",
                fontWeight: "bold",
                background: "#eab308",
                color: "#111827",
                border: "none",
                borderRadius: "12px",
                cursor: "pointer",
                opacity: isSyncing ? 0.7 : 1,
              }}
            >
              {isSyncing ? "同期中..." : "同期する"}
            </button>

            <button
              onClick={handleDailyReview}
              disabled={isReviewing}
              style={{
                padding: "16px",
                fontSize: "18px",
                fontWeight: "bold",
                background: "#10b981",
                color: "white",
                border: "none",
                borderRadius: "12px",
                cursor: "pointer",
                opacity: isReviewing ? 0.7 : 1,
              }}
            >
              {isReviewing ? "振り返り中..." : "今日を振り返る"}
            </button>

            <button
              onClick={handleClearAll}
              style={{
                padding: "14px",
                fontSize: "16px",
                background: "#e5e7eb",
                color: "#111827",
                border: "none",
                borderRadius: "12px",
                cursor: "pointer",
              }}
            >
              全部消す
            </button>
          </div>

          <p style={{ marginTop: "14px", color: "#666", fontSize: "15px" }}>
            未送信メモ: {unsentCount}件
          </p>

          {message && (
            <div
              style={{
                marginTop: "14px",
                padding: "14px",
                background: "#eff6ff",
                border: "1px solid #bfdbfe",
                borderRadius: "12px",
                lineHeight: 1.6,
              }}
            >
              {message}
            </div>
          )}

          {dailyComment && (
            <div
              style={{
                marginTop: "14px",
                padding: "16px",
                background: "#fff7ed",
                border: "1px solid #fed7aa",
                borderRadius: "12px",
                lineHeight: 1.8,
              }}
            >
              <h3 style={{ marginTop: 0, marginBottom: "10px", fontSize: "20px" }}>
                日次AIコメント
              </h3>
              <div style={{ whiteSpace: "pre-wrap" }}>{dailyComment}</div>
            </div>
          )}
        </section>

        <section
          style={{
            background: "white",
            padding: "18px",
            borderRadius: "16px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
          }}
        >
          <h2 style={{ fontSize: "24px", marginBottom: "14px" }}>日付一覧</h2>

          {groupedDates.length === 0 ? (
            <p>まだメモはありません。</p>
          ) : (
            <div
              style={{
                display: "flex",
                gap: "10px",
                overflowX: "auto",
                paddingBottom: "4px",
              }}
            >
              {groupedDates.map((dateKey) => {
                const isSelected = dateKey === selectedDateKey;

                return (
                  <button
                    key={dateKey}
                    onClick={() => setSelectedDateKey(dateKey)}
                    style={{
                      flex: "0 0 auto",
                      padding: "12px 16px",
                      borderRadius: "999px",
                      border: isSelected ? "2px solid #2563eb" : "1px solid #cbd5e1",
                      background: isSelected ? "#dbeafe" : "white",
                      cursor: "pointer",
                      fontSize: "15px",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {formatDateLabel(dateKey)}
                  </button>
                );
              })}
            </div>
          )}
        </section>

        <section
          style={{
            background: "white",
            padding: "18px",
            borderRadius: "16px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
          }}
        >
          <h2 style={{ fontSize: "24px", marginBottom: "14px" }}>
            {formatDateLabel(selectedDateKey)} のメモ
          </h2>

          {filteredList.length === 0 ? (
            <p>この日のメモはありません。</p>
          ) : (
            <div style={{ display: "grid", gap: "12px" }}>
              {filteredList.map((item) => (
                <div
                  key={item.id}
                  style={{
                    padding: "14px",
                    background: item.syncStatus === "unsent" ? "#fefce8" : "#f0fdf4",
                    border: `1px solid ${
                      item.syncStatus === "unsent" ? "#fde68a" : "#bbf7d0"
                    }`,
                    borderRadius: "12px",
                  }}
                >
                  <div
                    style={{
                      marginBottom: "8px",
                      fontSize: "13px",
                      color: "#666",
                      lineHeight: 1.5,
                    }}
                  >
                    {item.savedAt} / {item.syncStatus === "unsent" ? "未送信" : "送信済み"}
                  </div>

                  <div style={{ fontWeight: "bold", marginBottom: "6px", fontSize: "15px" }}>
                    {item.category}
                  </div>

                  <div style={{ lineHeight: 1.7, fontSize: "15px", whiteSpace: "pre-wrap" }}>
                    {item.content}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}