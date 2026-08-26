import { NextRequest, NextResponse } from "next/server";

import { ExtractError, fetchAndExtract, isValidHttpUrl } from "@/lib/extract";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const url = typeof body?.url === "string" ? body.url.trim() : "";

  if (!isValidHttpUrl(url)) {
    return NextResponse.json(
      { error: "올바른 URL을 입력해주세요." },
      { status: 400 }
    );
  }

  try {
    const result = await fetchAndExtract(url);
    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof ExtractError
        ? error.message
        : "이 페이지에서 본문을 추출하지 못했어요.";
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
