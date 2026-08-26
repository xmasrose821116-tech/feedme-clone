// @vitest-environment node
import { afterEach, describe, expect, test, vi } from "vitest";
import { NextRequest } from "next/server";

import { POST } from "@/app/api/convert/route";

const ARTICLE_HTML = `<!DOCTYPE html>
<html lang="ko">
<head><title>테스트 기사</title></head>
<body>
  <nav><a href="/">홈</a></nav>
  <article>
    <h1>테스트 기사</h1>
    <p>이것은 테스트를 위한 충분히 긴 본문 문단입니다. 여러 문장을 포함해 defuddle이 실제 기사로 인식할 수 있도록 합니다.</p>
    <p>두 번째 문단도 있습니다. 캐시 적중률이 88.7%로 올라갔다는 이야기를 담고 있습니다.</p>
  </article>
</body>
</html>`;

function postRequest(body: unknown) {
  return new NextRequest("http://localhost/api/convert", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/convert", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test("URL 형식이 아니면 400을 반환한다", async () => {
    const response = await POST(postRequest({ url: "not a url" }));
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBeTruthy();
  });

  test("정상적인 페이지는 추출 결과를 반환한다", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(ARTICLE_HTML, {
          status: 200,
          headers: { "content-type": "text/html" },
        })
      )
    );

    const response = await POST(
      postRequest({ url: "https://example.com/article" })
    );
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.title).toContain("테스트 기사");
    expect(data.contentMarkdown).toContain("캐시 적중률");
  });

  test("페이지를 가져오지 못하면 422를 반환한다", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("", { status: 404 }))
    );

    const response = await POST(
      postRequest({ url: "https://example.com/missing" })
    );
    expect(response.status).toBe(422);
    const data = await response.json();
    expect(data.error).toBeTruthy();
  });
});
