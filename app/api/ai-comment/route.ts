export async function POST() {
  return Response.json(
    {
      message:
        "このAPIは現在使用していません。AIコメントは「今日を振り返る」で生成してください。",
    },
    { status: 410 }
  );
}