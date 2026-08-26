# LLM handoff export (ChatGPT/Claude로 열기)

## Decisions

- "ChatGPT로 열기"와 "Claude로 열기"는 동일한 방식을 쓴다: (선택된 프롬프트 + 마크다운)을 클립보드에 자동 복사한 뒤, 해당 서비스의 새 채팅 페이지를 새 탭으로 연다. 사용자가 도착 후 붙여넣기(Ctrl+V)해서 완료한다.
- URL 쿼리 파라미터로 콘텐츠를 자동 프리필하는 방식은 사용하지 않는다.

## Boundaries

- 두 서비스 모두 같은 export 동작을 공유한다. 서비스별로 다른 동작(예: 한쪽만 자동 채움)을 만들지 않는다.
- `window.open(url, '_blank')`는 클립보드 복사(`navigator.clipboard.writeText`)를 `await`하기 **전에**, 클릭 핸들러 안에서 동기적으로 먼저 호출해야 한다. `await` 뒤에 호출하면 브라우저가 사용자 제스처와의 연결이 끊겼다고 판단해 새 탭을 팝업으로 차단한다(프로토타입에서 실제로 재현·확인함).

## Why

- ChatGPT(`chatgpt.com/?q=...`)는 비공식 URL 파라미터로 로그인 없이도 입력창을 프리필하지만, 문서화되지 않은 동작이고 URL 길이 제한(수천 자 수준)이 있어 긴 글 전체를 담기 어렵다.
- Claude(`claude.ai/new?q=...`)는 실제 테스트 결과 파라미터가 무시되고 로그인 페이지로 리다이렉트되어 프리필이 되지 않는다. 2025년 10월경 해당 파라미터가 제거됐다는 정황도 확인됨.
- 두 서비스에 각각 다른 방식을 적용하면 UX가 비대칭적이고, ChatGPT 쪽도 언제든 비공식 파라미터가 막힐 수 있어 신뢰할 수 없다. 클립보드 복사 방식은 글 길이와 무관하게 두 서비스 모두에서 항상 동작한다.

## Reconsider when

- ChatGPT 또는 Claude가 콘텐츠 프리필을 위한 공식 API/URL 파라미터를 문서화해 제공하는 경우.

## Evidence worth preserving

- 실측 확인(2026-08-26): `chatgpt.com/?q=hello%20world%20test` → 로그인 없이 입력창에 텍스트 프리필됨. `claude.ai/new?q=hello%20world%20test` → 파라미터 무시, 로그인 페이지로 이동.
