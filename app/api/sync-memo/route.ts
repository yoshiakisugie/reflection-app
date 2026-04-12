export async function POST(req: Request) {
  try {
    const memo = await req.json();

    const gasUrl = process.env.GAS_WEB_APP_URL;

    if (!gasUrl) {
      return Response.json(
        { message: "GAS_WEB_APP_URL が設定されていません。" },
        { status: 500 }
      );
    }

    const gasRes = await fetch(gasUrl, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8",
      },
      body: JSON.stringify({
        savedAt: memo.savedAt,
        dateKey: memo.dateKey,
        todayEvent: memo.category === "今日あったこと" ? memo.content : "",
        todayInsight: memo.category === "今日の気づき" ? memo.content : "",
        tomorrowStep: memo.category === "明日の一歩" ? memo.content : "",
        aiComment: memo.category === "その他" ? memo.content : "",
      }),
    });

    const gasText = await gasRes.text();
    console.log("sync-memo GAS status:", gasRes.status);
    console.log("sync-memo GAS response:", gasText);

    if (!gasRes.ok) {
      throw new Error(`GAS同期失敗: ${gasRes.status} ${gasText}`);
    }

    return Response.json({ status: "success" });
  } catch (error) {
    console.error(error);
    return Response.json(
      { message: "メモ同期に失敗しました。" },
      { status: 500 }
    );
  }
}