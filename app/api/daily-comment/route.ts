import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { dateKey, memos } = await req.json();

    const gasUrl = process.env.GAS_WEB_APP_URL;

    if (!gasUrl) {
      return Response.json(
        { message: "GAS_WEB_APP_URL が設定されていません。" },
        { status: 500 }
      );
    }

    const todayEvents = memos
      .filter((m: any) => m.category === "今日あったこと")
      .map((m: any) => `- ${m.content}`)
      .join("\n");

    const todayInsights = memos
      .filter((m: any) => m.category === "今日の気づき")
      .map((m: any) => `- ${m.content}`)
      .join("\n");

    const tomorrowSteps = memos
      .filter((m: any) => m.category === "明日の一歩")
      .map((m: any) => `- ${m.content}`)
      .join("\n");

    const prompt = `
あなたは、やさしく内省を支援するAIコーチです。
以下は ${dateKey} の1日分のメモです。
内容を踏まえて、日次コメントを日本語で作成してください。

【今日あったこと】
${todayEvents || "未入力"}

【今日の気づき】
${todayInsights || "未入力"}

【明日の一歩】
${tomorrowSteps || "未入力"}

条件:
- 4〜6文
- やさしく、前向き
- 1日の意味づけが伝わる
- 決まり文句すぎない
- 最後に軽い問いかけを1つ入れる
`;

    const response = await client.responses.create({
      model: "gpt-4o-mini",
      input: prompt,
    });

    const dailyAiComment =
      response.output_text || "日次AIコメントを取得できませんでした。";

    const savedAt = new Date().toLocaleString("ja-JP", {
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
        savedAt,
        dateKey,
        todayEventSummary: todayEvents,
        todayInsightSummary: todayInsights,
        tomorrowStepSummary: tomorrowSteps,
        dailyAiComment,
      }),
    });

    const gasText = await gasRes.text();
    console.log("daily-comment GAS status:", gasRes.status);
    console.log("daily-comment GAS response:", gasText);

    if (!gasRes.ok) {
      throw new Error(`日次サマリー保存失敗: ${gasRes.status} ${gasText}`);
    }

    return Response.json({
      comment: dailyAiComment,
      todayEventSummary: todayEvents,
      todayInsightSummary: todayInsights,
      tomorrowStepSummary: tomorrowSteps,
    });
  } catch (error) {
    console.error(error);
    return Response.json(
      { message: "日次AIコメントの生成に失敗しました。" },
      { status: 500 }
    );
  }
}