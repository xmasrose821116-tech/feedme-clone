// @vitest-environment node
import { describe, expect, test } from "vitest";

import { ExtractError, extractFromHtml, isValidHttpUrl } from "@/lib/extract";

const ARTICLE_HTML = `<!DOCTYPE html>
<html lang="ko">
<head>
  <title>캐싱 전략을 다시 설계한 이유</title>
  <meta name="author" content="이하늘" />
</head>
<body>
  <nav><a href="/">홈</a><a href="/about">소개</a></nav>
  <header><div class="ad">광고입니다</div></header>
  <article>
    <h1>캐싱 전략을 다시 설계한 이유</h1>
    <p>지난 분기까지 우리는 TTL 고정형 캐시를 5분 단위로 돌려왔다. 캐시 적중률이 61.4%까지 떨어지면서 문제가 됐다.</p>
    <p>새 전략은 계층형 무효화를 사용한다.</p>
    <script>alert('xss');</script>
    <img src="x.png" onerror="alert('xss')" />
  </article>
  <footer>copyright 2024</footer>
</body>
</html>`;

describe("extractFromHtml", () => {
  test("기사 본문에서 제목과 마크다운을 추출한다", async () => {
    const result = await extractFromHtml(
      ARTICLE_HTML,
      "https://buildnote.dev/2024/rethinking-our-cache-strategy"
    );

    expect(result.title).toContain("캐싱 전략");
    expect(result.contentMarkdown).toContain("캐시 적중률");
    expect(result.contentHtml).toContain("캐시 적중률");
  });

  test("스크립트와 이벤트 핸들러를 제거해 XSS를 방지한다", async () => {
    const result = await extractFromHtml(
      ARTICLE_HTML,
      "https://buildnote.dev/2024/rethinking-our-cache-strategy"
    );

    expect(result.contentHtml).not.toContain("<script");
    expect(result.contentHtml).not.toContain("onerror");
  });

  test("본문을 찾을 수 없으면 ExtractError를 던진다", async () => {
    const emptyHtml = "<html><head><title>빈 페이지</title></head><body></body></html>";
    await expect(
      extractFromHtml(emptyHtml, "https://example.com/empty")
    ).rejects.toBeInstanceOf(ExtractError);
  });
});

describe("isValidHttpUrl", () => {
  test.each([
    "https://example.com/article",
    "http://example.com",
  ])("%s는 유효하다", (url) => {
    expect(isValidHttpUrl(url)).toBe(true);
  });

  test.each([
    "",
    "not a url",
    "ftp://example.com/file",
    "javascript:alert(1)",
  ])("%s는 유효하지 않다", (url) => {
    expect(isValidHttpUrl(url)).toBe(false);
  });
});
