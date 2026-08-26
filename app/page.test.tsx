import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import Home from "@/app/page";

const RESULT = {
  title: "캐싱 전략을 다시 설계한 이유",
  author: "이하늘",
  site: "buildnote.dev",
  published: "2024년 11월 3일",
  wordCount: 400,
  contentHtml: "<p>캐시 적중률이 88.7%로 올라갔다.</p>",
  contentMarkdown: "캐시 적중률이 88.7%로 올라갔다.",
};

beforeEach(() => {
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

test("URL을 변환하면 제목과 본문이 표시된다", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => RESULT,
    })
  );

  render(<Home />);

  fireEvent.change(screen.getByLabelText("웹페이지 URL"), {
    target: { value: "https://buildnote.dev/2024/rethinking-our-cache-strategy" },
  });
  fireEvent.click(screen.getByRole("button", { name: "변환하기" }));

  await waitFor(() =>
    expect(
      screen.getByRole("heading", { name: RESULT.title })
    ).toBeInTheDocument()
  );
  expect(screen.getByText(/이하늘/)).toBeInTheDocument();
});

test("변환 실패 시 에러 메시지를 보여주고 재시도할 수 있다", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: "본문을 추출하지 못했어요." }),
    })
  );

  render(<Home />);

  fireEvent.change(screen.getByLabelText("웹페이지 URL"), {
    target: { value: "https://example.com/paywalled" },
  });
  fireEvent.click(screen.getByRole("button", { name: "변환하기" }));

  await waitFor(() =>
    expect(screen.getByText("본문을 추출하지 못했어요.")).toBeInTheDocument()
  );

  const convertButton = screen.getByRole("button", { name: "변환하기" });
  expect(convertButton).toBeEnabled();
});

test("지우기를 누르면 입력과 결과가 초기화된다", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => RESULT,
    })
  );

  render(<Home />);

  const input = screen.getByLabelText("웹페이지 URL") as HTMLInputElement;
  fireEvent.change(input, { target: { value: "https://buildnote.dev/x" } });
  fireEvent.click(screen.getByRole("button", { name: "변환하기" }));

  await waitFor(() =>
    expect(
      screen.getByRole("heading", { name: RESULT.title })
    ).toBeInTheDocument()
  );

  fireEvent.click(screen.getByRole("button", { name: "지우기" }));

  expect(input.value).toBe("");
  expect(
    screen.queryByRole("heading", { name: RESULT.title })
  ).not.toBeInTheDocument();
});

test("프롬프트 프리셋을 선택하면 복사하는 텍스트 앞에 붙는다", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => RESULT,
    })
  );
  const writeText = vi.fn().mockResolvedValue(undefined);
  Object.assign(navigator, { clipboard: { writeText } });

  render(<Home />);

  fireEvent.change(screen.getByLabelText("웹페이지 URL"), {
    target: { value: "https://buildnote.dev/x" },
  });
  fireEvent.click(screen.getByRole("button", { name: "변환하기" }));
  await waitFor(() =>
    expect(
      screen.getByRole("heading", { name: RESULT.title })
    ).toBeInTheDocument()
  );

  fireEvent.click(screen.getByRole("button", { name: "요약해줘" }));
  fireEvent.click(screen.getByRole("button", { name: /복사하기/ }));

  await waitFor(() => expect(writeText).toHaveBeenCalled());
  expect(writeText.mock.calls[0][0]).toMatch(/^요약해줘\n\n---\n\n/);
});

test(".md 다운로드에는 프롬프트가 포함되지 않는다", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => RESULT,
    })
  );
  vi.stubGlobal("URL", {
    ...URL,
    createObjectURL: vi.fn().mockReturnValue("blob:mock"),
    revokeObjectURL: vi.fn(),
  });
  let capturedBlob: Blob | null = null;
  const originalCreateObjectURL = URL.createObjectURL as (
    obj: Blob
  ) => string;
  (URL.createObjectURL as unknown as ReturnType<typeof vi.fn>).mockImplementation(
    (blob: Blob) => {
      capturedBlob = blob;
      return "blob:mock";
    }
  );
  void originalCreateObjectURL;

  render(<Home />);

  fireEvent.change(screen.getByLabelText("웹페이지 URL"), {
    target: { value: "https://buildnote.dev/x" },
  });
  fireEvent.click(screen.getByRole("button", { name: "변환하기" }));
  await waitFor(() =>
    expect(
      screen.getByRole("heading", { name: RESULT.title })
    ).toBeInTheDocument()
  );

  fireEvent.click(screen.getByRole("button", { name: "요약해줘" }));
  fireEvent.click(screen.getByRole("button", { name: /\.md 다운로드/ }));

  expect(capturedBlob).not.toBeNull();
  const text = await (capturedBlob as unknown as Blob).text();
  expect(text).toBe(RESULT.contentMarkdown);
  expect(text).not.toContain("요약해줘");
});
