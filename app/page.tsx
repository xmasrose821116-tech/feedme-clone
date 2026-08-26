"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { ArrowUpRight, Copy, Download, Moon, Sun, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { ExtractResult } from "@/lib/extract";

type Phase = "idle" | "loading" | "result" | "error";

const PROMPT_PRESETS = [
  { key: "summarize", label: "요약해줘" },
  { key: "translate", label: "한국어로 번역해줘" },
  { key: "explain", label: "쉽게 설명해줘" },
] as const;

type PromptKey = (typeof PROMPT_PRESETS)[number]["key"] | "custom";

function slugify(text: string): string {
  const cleaned = text
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
  return cleaned || "converted";
}

function subscribeToColorScheme(onChange: () => void) {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

function getSystemPrefersDark() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function getSystemPrefersDarkOnServer() {
  return false;
}

export default function Home() {
  // useSyncExternalStore renders `getSystemPrefersDarkOnServer` during SSR and
  // the initial client render (avoiding a hydration mismatch), then syncs to
  // the real system preference right after.
  const systemPrefersDark = useSyncExternalStore(
    subscribeToColorScheme,
    getSystemPrefersDark,
    getSystemPrefersDarkOnServer
  );
  const [darkOverride, setDarkOverride] = useState<boolean | null>(null);
  const isDark = darkOverride ?? systemPrefersDark;
  const [url, setUrl] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [result, setResult] = useState<ExtractResult | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [selectedPromptKey, setSelectedPromptKey] = useState<PromptKey | null>(
    null
  );
  const [customPrompt, setCustomPrompt] = useState("");
  const [feedback, setFeedback] = useState("");
  const flashTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined
  );

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
  }, [isDark]);

  function flash(message: string) {
    setFeedback(message);
    clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setFeedback(""), 2200);
  }

  async function handleConvert() {
    const trimmed = url.trim();
    if (!trimmed || phase === "loading") return;
    setPhase("loading");
    try {
      const response = await fetch("/api/convert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: trimmed }),
      });
      const data = await response.json();
      if (!response.ok) {
        setErrorMessage(data.error ?? "이 페이지에서 본문을 추출하지 못했어요.");
        setPhase("error");
        return;
      }
      setResult(data);
      setPhase("result");
    } catch {
      setErrorMessage(
        "페이지를 가져오지 못했어요. 네트워크 상태를 확인하고 다시 시도해주세요."
      );
      setPhase("error");
    }
  }

  function handleClear() {
    setUrl("");
    setPhase("idle");
    setResult(null);
    setErrorMessage("");
    setSelectedPromptKey(null);
    setCustomPrompt("");
  }

  function selectPrompt(key: PromptKey) {
    setSelectedPromptKey((current) => (current === key ? null : key));
  }

  function promptText(): string {
    if (selectedPromptKey === "custom") return customPrompt.trim();
    const preset = PROMPT_PRESETS.find((p) => p.key === selectedPromptKey);
    return preset?.label ?? "";
  }

  function exportText(): string {
    const prompt = promptText();
    const prefix = prompt ? `${prompt}\n\n---\n\n` : "";
    return prefix + (result?.contentMarkdown ?? "");
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(exportText());
    } catch {}
    flash("클립보드에 복사했어요");
  }

  function handleDownload() {
    if (!result) return;
    const blob = new Blob([result.contentMarkdown], { type: "text/markdown" });
    const filename = `${slugify(result.title)}.md`;
    const href = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = href;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(href);
    flash(`${filename} 다운로드했어요`);
  }

  async function openWith(name: string, targetUrl: string) {
    window.open(targetUrl, "_blank", "noopener");
    try {
      await navigator.clipboard.writeText(exportText());
    } catch {}
    flash(`${name} 새 탭을 열고 클립보드에 복사했어요 — 붙여넣기(Ctrl+V) 하세요`);
  }

  const showResult = phase === "result" && result !== null;

  return (
    <div className="flex flex-1 justify-center bg-background px-4 py-10 sm:px-6">
      <div className="flex w-full max-w-2xl flex-col gap-5">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold tracking-tight">
            URL to Markdown{" "}
            <span className="font-normal text-muted-foreground">
              · 웹페이지를 마크다운으로
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            aria-label="다크모드 전환"
            onClick={() => setDarkOverride(!isDark)}
          >
            {isDark ? <Moon className="size-4" /> : <Sun className="size-4" />}
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleConvert();
            }}
            placeholder="https://example.com/article"
            aria-label="웹페이지 URL"
            className="h-10 flex-1"
          />
          <Button onClick={handleConvert} disabled={phase === "loading"}>
            {phase === "loading" ? "변환 중..." : "변환하기"}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="지우기"
            onClick={handleClear}
          >
            <X className="size-4" />
          </Button>
        </div>
        {phase === "idle" && (
          <p className="text-xs text-muted-foreground">
            웹페이지 URL을 붙여넣고 변환하기를 누르세요.
          </p>
        )}

        {phase === "error" && (
          <Alert variant="destructive">
            <AlertTitle>본문을 추출하지 못했어요</AlertTitle>
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}

        {showResult && (
          <Card className="px-5 py-4">
            <div className="text-xs font-semibold text-muted-foreground">
              프롬프트 (선택)
            </div>
            <div className="flex flex-wrap gap-1.5">
              {PROMPT_PRESETS.map((preset) => (
                <Button
                  key={preset.key}
                  type="button"
                  size="sm"
                  variant={selectedPromptKey === preset.key ? "default" : "outline"}
                  className="rounded-full"
                  onClick={() => selectPrompt(preset.key)}
                >
                  {preset.label}
                </Button>
              ))}
              <Button
                type="button"
                size="sm"
                variant={selectedPromptKey === "custom" ? "default" : "outline"}
                className="rounded-full"
                onClick={() => selectPrompt("custom")}
              >
                직접 입력
              </Button>
            </div>
            {selectedPromptKey === "custom" && (
              <Textarea
                autoFocus
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                placeholder="예: 이 글에서 핵심 문장 5개만 뽑아줘"
              />
            )}
            <p className="text-xs text-muted-foreground">
              선택한 프롬프트는 복사하기·ChatGPT/Claude로 열기 앞에 붙어요. .md
              다운로드에는 포함되지 않고, 저장되지 않아요.
            </p>
          </Card>
        )}

        {showResult && (
          <Card className="overflow-hidden py-0">
            <div className="border-b border-border px-5 py-4">
              <h1 className="text-lg font-semibold tracking-tight">
                {result.title || "제목 없음"}
              </h1>
              <div className="mt-1 flex flex-wrap gap-x-1.5 text-xs text-muted-foreground">
                {[
                  result.author,
                  result.site,
                  result.published,
                  result.wordCount
                    ? `읽는 데 약 ${Math.max(1, Math.round(result.wordCount / 200))}분`
                    : null,
                ]
                  .filter(Boolean)
                  .map((item, i) => (
                    <span key={i}>
                      {i > 0 && <span className="mr-1.5">·</span>}
                      {item}
                    </span>
                  ))}
              </div>
            </div>
            <div
              className="markdown-preview px-5 py-4 text-sm leading-7"
              dangerouslySetInnerHTML={{ __html: result.contentHtml }}
            />
            <div className="flex flex-wrap items-center gap-2 border-t border-border px-5 py-4">
              <Button variant="outline" size="sm" onClick={handleCopy}>
                <Copy className="size-3.5" /> 복사하기
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownload}>
                <Download className="size-3.5" /> .md 다운로드
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => openWith("ChatGPT", "https://chatgpt.com/")}
              >
                <ArrowUpRight className="size-3.5" /> ChatGPT로 열기
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => openWith("Claude", "https://claude.ai/new")}
              >
                <ArrowUpRight className="size-3.5" /> Claude로 열기
              </Button>
              <span
                className={
                  feedback
                    ? "text-xs text-muted-foreground transition-opacity opacity-100"
                    : "text-xs text-muted-foreground transition-opacity opacity-0"
                }
              >
                {feedback}
              </span>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
