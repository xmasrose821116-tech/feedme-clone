# API 라우트가 예상 밖 예외를 로그 없이 조용히 뭉갠다

`app/api/convert/route.ts`의 catch 블록이 `ExtractError`가 아닌 예외(예: linkedom/Defuddle/DOMPurify 내부 오류)를 서버 로그 하나 없이 동일한 일반 에러 메시지로 반환한다 — "본문 추출 실패"와 "우리 코드 버그"를 프로덕션에서 구분할 방법이 없다.
