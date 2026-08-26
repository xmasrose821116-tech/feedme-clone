import { parseHTML } from "linkedom";
import { Defuddle } from "defuddle/node";
import DOMPurify from "isomorphic-dompurify";

export type ExtractResult = {
  title: string;
  author: string | null;
  site: string | null;
  published: string | null;
  wordCount: number | null;
  contentHtml: string;
  contentMarkdown: string;
};

export class ExtractError extends Error {}

export function isValidHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export async function extractFromHtml(
  html: string,
  url: string
): Promise<ExtractResult> {
  const { document } = parseHTML(html);
  // linkedom doesn't implement styleSheets/getComputedStyle, but defuddle's
  // internals call them; polyfill the same way defuddle's own CLI does
  // (dist/utils/linkedom-compat.js) since the README example omits this.
  const doc = document as unknown as {
    styleSheets?: unknown[];
    defaultView?: { getComputedStyle?: () => { display: string } };
  };
  if (!doc.styleSheets) doc.styleSheets = [];
  if (doc.defaultView && !doc.defaultView.getComputedStyle) {
    doc.defaultView.getComputedStyle = () => ({ display: "" });
  }

  // `markdown` and `separateMarkdown` are mutually exclusive in defuddle's
  // source (dist/markdown.js: `if (options.markdown) ... else if
  // (options.separateMarkdown)`), unlike what the README implies. Only
  // `separateMarkdown` is set here so `content` stays HTML (for the sanitized
  // preview) while `contentMarkdown` is produced separately (for export).
  const result = await Defuddle(document, url, {
    separateMarkdown: true,
  });

  if (!result.content || !result.contentMarkdown) {
    throw new ExtractError("이 페이지에서 본문을 추출하지 못했어요.");
  }

  return {
    title: result.title || "",
    author: result.author || null,
    site: result.site || result.domain || null,
    published: result.published || null,
    wordCount: result.wordCount ?? null,
    contentHtml: DOMPurify.sanitize(result.content),
    contentMarkdown: result.contentMarkdown,
  };
}

const FETCH_TIMEOUT_MS = 15000;
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

export async function fetchAndExtract(url: string): Promise<ExtractResult> {
  let response: Response;
  try {
    response = await fetch(url, {
      redirect: "follow",
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
  } catch {
    throw new ExtractError(
      "페이지를 가져오지 못했어요. URL을 다시 확인해주세요."
    );
  }

  if (!response.ok) {
    throw new ExtractError(
      "이 페이지에서 본문을 추출하지 못했어요. 로그인이 필요한 페이지이거나 접근이 차단되어 있는 것 같아요."
    );
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("text/html")) {
    throw new ExtractError("웹페이지(HTML) URL이 아니에요.");
  }

  const html = await response.text();
  return extractFromHtml(html, url);
}
