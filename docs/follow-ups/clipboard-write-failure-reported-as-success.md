# 클립보드 복사 실패해도 성공 토스트가 뜬다

`app/page.tsx`의 `handleCopy`/`openWith`가 `navigator.clipboard.writeText` 실패를 `catch {}`로 삼키고 항상 "복사했어요" 토스트를 띄운다 — 권한 거부나 포커스 이동(특히 `openWith`가 새 탭을 연 직후) 시 사용자는 실패를 알 수 없다.
