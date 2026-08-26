# content-type 헤더가 없으면 정상 HTML 페이지도 변환 실패로 처리된다

`lib/extract.ts`의 `fetchAndExtract`가 `content-type`에 `text/html`이 없으면 무조건 거부하는데, 일부 정적 호스팅/CDN은 이 헤더를 아예 안 보내거나 다른 표기를 쓴다 — 실제로는 유효한 기사 URL이 "HTML이 아니다"로 거부될 수 있다.
