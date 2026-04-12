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
  const [category, setCategory] = useState("今日あったこと");
  const [content, setContent] = useState("");
  const [memoList, setMemoList] = useState<MemoItem[]>([]);
  const [selectedDateKey, setSelectedDateKey] = useState(formatDateKey(new Date()));
  const [message, setMessage] = useState("");

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return;

    try {
      const parsed: MemoItem[] = JSON.parse(stored);
      setMemoList(parsed);
    } catch (error) {
      console.error(error);
    }
  }, []);

  const todayKey = formatDateKey(new Date());

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

  const handleMarkAllSent = () => {
    const updated = memoList.map((item) =>
      item.syncStatus === "unsent" ? { ...item, syncStatus: "sent" } : item
    );

    setMemoList(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    setMessage("未送信メモを送信済みに変更しました。");
  };

  const handleClearAll = () => {
    localStorage.removeItem(STORAGE_KEY);
    setMemoList([]);
    setSelectedDateKey(todayKey);
    setContent("");
    setMessage("");
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "24px 16px 40px",
        fontFamily: "sans-serif",
        background: "#f7f7f7",
      }}
    >
      <div
        style={{
          maxWidth: "960px",
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "1fr",
          gap: "20px",
        }}
      >
        <div
          style={{
            background: "white",
            padding: "24px",
            borderRadius: "16px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
          }}
        >
          <h1 style={{ fontSize: "30px", marginBottom: "8px" }}>メモ入力</h1>
          <p style={{ color: "#666", marginBottom: "20px" }}>
            その瞬間の気づきを、1件ずつためます
          </p>

          <div style={{ marginBottom: "16px" }}>
            <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold" }}>
              区分
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              style={{
                width: "100%",
                padding: "12px",
                fontSize: "16px",
                borderRadius: "8px",
                border: "1px solid #ccc",
              }}
            >
              {categories.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: "20px" }}>
            <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold" }}>
              内容
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              style={{
                width: "100%",
                minHeight: "120px",
                padding: "12px",
                fontSize: "16px",
                borderRadius: "8px",
                border: "1px solid #ccc",
              }}
              placeholder="思いついたことを1件ずつ書いてください"
            />
          </div>

          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            <button
              onClick={handleAddMemo}
              style={{
                padding: "14px 24px",
                fontSize: "16px",
                background: "#2563eb",
                color: "white",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
              }}
            >
              追加保存する
            </button>

            <button
              onClick={handleMarkAllSent}
              style={{
                padding: "14px 24px",
                fontSize: "16px",
                background: "#eab308",
                color: "#111827",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
              }}
            >
              仮で送信済みにする
            </button>

            <button
              onClick={handleClearAll}
              style={{
                padding: "14px 24px",
                fontSize: "16px",
                background: "#e5e7eb",
                color: "#111827",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
              }}
            >
              全部消す
            </button>
          </div>

          <p style={{ marginTop: "14px", color: "#666" }}>
            未送信メモ: {unsentCount}件
          </p>

          {message && (
            <div
              style={{
                marginTop: "16px",
                padding: "14px",
                background: "#eff6ff",
                border: "1px solid #bfdbfe",
                borderRadius: "10px",
              }}
            >
              {message}
            </div>
          )}
        </div>

        <div
          style={{
            background: "white",
            padding: "24px",
            borderRadius: "16px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
          }}
        >
          <h2 style={{ fontSize: "24px", marginBottom: "16px" }}>日付一覧</h2>

          {groupedDates.length === 0 ? (
            <p>まだメモはありません。</p>
          ) : (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
              {groupedDates.map((dateKey) => {
                const isSelected = dateKey === selectedDateKey;

                return (
                  <button
                    key={dateKey}
                    onClick={() => setSelectedDateKey(dateKey)}
                    style={{
                      padding: "10px 14px",
                      borderRadius: "999px",
                      border: isSelected ? "2px solid #2563eb" : "1px solid #cbd5e1",
                      background: isSelected ? "#dbeafe" : "white",
                      cursor: "pointer",
                      fontSize: "14px",
                    }}
                  >
                    {formatDateLabel(dateKey)}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div
          style={{
            background: "white",
            padding: "24px",
            borderRadius: "16px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
          }}
        >
          <h2 style={{ fontSize: "24px", marginBottom: "16px" }}>
            {formatDateLabel(selectedDateKey)} のメモ
          </h2>

          {filteredList.length === 0 ? (
            <p>この日のメモはありません。</p>
          ) : (
            <div style={{ display: "grid", gap: "14px" }}>
              {filteredList.map((item) => (
                <div
                  key={item.id}
                  style={{
                    padding: "16px",
                    background: item.syncStatus === "unsent" ? "#fefce8" : "#f0fdf4",
                    border: `1px solid ${
                      item.syncStatus === "unsent" ? "#fde68a" : "#bbf7d0"
                    }`,
                    borderRadius: "12px",
                  }}
                >
                  <div style={{ marginBottom: "8px", fontSize: "14px", color: "#666" }}>
                    {item.savedAt} / {item.syncStatus === "unsent" ? "未送信" : "送信済み"}
                  </div>
                  <div style={{ fontWeight: "bold", marginBottom: "6px" }}>{item.category}</div>
                  <div>{item.content}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}