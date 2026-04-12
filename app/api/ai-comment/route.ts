import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { todayEvent, todayInsight, tomorrowStep, dateKey, savedAt } =
      await req.json();

    const prompt = `
あなたは、やさしく内省を支援するAIコーチです。
以下の振り返り内容をもとに、日本語で自然なコメントを返してください。

【今日あったこと】
${todayEvent || "未入力"}

【今日の気づき】
${todayInsight || "未入力"}

【明日の一歩】
${tomorrowStep || "未入力"}

条件:
- 3〜5文程度
- やさしく、前向き
- 断定しすぎない
- テンプレートのような決まり文句にしない
- 入力内容に応じて自然に言い換える
- 最後に軽い問いかけを1つ入れる
`;

    const response = await client.responses.create({
      model: "gpt-4o-mini",
      input: prompt,
    });

    const aiComment =
      response.output_text ||
      response.output?.[0]?.content?.[0]?.text ||
      "AIコメントを取得できませんでした。";

    const gasUrl = process.env.GAS_WEB_APP_URL;

    if (gasUrl) {
      const gasRes = await fetch(gasUrl, {
        method: "POST",
        headers: {
          "Content-Type": "text/plain;charset=utf-8",
        },
        body: JSON.stringify({
          savedAt,
          dateKey,
          todayEvent,
          todayInsight,
          tomorrowStep,
          aiComment,
        }),
      });

      const gasText = await gasRes.text();
      console.log("GAS status:", gasRes.status);
      console.log("GAS response:", gasText);

      if (!gasRes.ok) {
        throw new Error(`GAS連携失敗: ${gasRes.status} ${gasText}`);
      }
    }

    return Response.json({
      comment: aiComment,
    });
  } catch (error) {
    console.error(error);
    return Response.json(
      { comment: "AIコメントの生成に失敗しました。" },
      { status: 500 }
    );
  }
}