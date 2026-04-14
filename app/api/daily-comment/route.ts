import OpenAI from "openai";

type MemoInput = {
  dateKey: string;
  category:
    | "今日あったこと"
    | "今日の気づき"
    | "改善できそうなこと"
    | "その他";
  content: string;
};

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function joinMemoContents(memos: MemoInput[], category: MemoInput["category"]) {
  return memos
    .filter((m) => m.category === category)
    .map((m) => `- ${m.content}`)
    .join("\n");
}

function parseAiResult(text: string) {
  const normalized = text.replace(/\r\n/g, "\n");

  const titleMatch = normalized.match(/タイトル[:：]\s*(.+)/);
  const commentMatch = normalized.match(/AIコメント[:：]\s*([\s\S]+)/);

  return {
    title: titleMatch?.[1]?.trim() || "今日の振り返り",
    comment: commentMatch?.[1]?.trim() || normalized.trim(),
  };
}

export async function POST(req: Request) {
  try {
    const { dateKey, memos }: { dateKey: string; memos: MemoInput[] } = await req.json();

    const gasUrl = process.env.GAS_WEB_APP_URL;

    if (!gasUrl) {
      return Response.json(
        { message: "GAS_WEB_APP_URL が設定されていません。" },
        { status: 500 }
      );
    }

    if (!Array.isArray(memos) || memos.length === 0) {
      return Response.json(
        { message: "振り返り対象メモがありません。" },
        { status: 400 }
      );
    }

    const todayEventsSummary = joinMemoContents(memos, "今日あったこと");
    const insightsSummary = joinMemoContents(memos, "今日の気づき");
    const improvementsSummary = joinMemoContents(memos, "改善できそうなこと");
    const othersSummary = joinMemoContents(memos, "その他");

    const prompt = `
あなたは、やさしく内省を支援するAIコーチです。
以下は ${dateKey} の1日分のメモです。
この内容をもとに、日次サマリー用のタイトルとAIコメントを日本語で作成してください。

【今日あったこと】
${todayEventsSummary || "なし"}

【今日の気づき】
${insightsSummary || "なし"}

【改善できそうなこと】
${improvementsSummary || "なし"}

【その他】
${othersSummary || "なし"}

条件:
- タイトルは短く、1行
- AIコメントは4〜6文
- 以下の観点を含める
  1. 今日の全体整理
  2. 今日の気づきの要約
  3. 改善の視点
  4. 明日の行動ヒント
- やさしく、自然な日本語
- テンプレート感を弱める

出力形式:
タイトル: （ここにタイトル）
AIコメント:
（ここに本文）
`;

    const response = await client.responses.create({
      model: "gpt-4o-mini",
      input: prompt,
    });

    const outputText =
      response.output_text || "タイトル: 今日の振り返り\nAIコメント:\n今日は一日を整理しました。";
    const parsed = parseAiResult(outputText);

    const updatedAt = new Date().toLocaleString("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

    const gasRes = await fetch(gasUrl, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8",
      },
      body: JSON.stringify({
        type: "daily_summary",
        dateKey,
        title: parsed.title,
        todayEventsSummary,
        insightsSummary,
        improvementsSummary,
        othersSummary,
        aiComment: parsed.comment,
        isClosed: true,
        updatedAt,
      }),
    });

    const gasText = await gasRes.text();
    console.log("daily-comment GAS status:", gasRes.status);
    console.log("daily-comment GAS response:", gasText);

    if (!gasRes.ok) {
      throw new Error(`日次サマリー保存失敗: ${gasRes.status} ${gasText}`);
    }

    return Response.json({
      title: parsed.title,
      comment: parsed.comment,
      todayEventsSummary,
      insightsSummary,
      improvementsSummary,
      othersSummary,
    });
  } catch (error) {
    console.error(error);
    return Response.json(
      { message: "日次振り返りの生成に失敗しました。" },
      { status: 500 }
    );
  }
}