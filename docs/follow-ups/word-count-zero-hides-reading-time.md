# wordCount가 0이면 읽는 시간 배지가 조용히 사라진다

`app/page.tsx`의 `result.wordCount ? ... : null` 삼항 연산이 falsy-zero를 null과 동일하게 취급한다 — `lib/extract.ts`는 `wordCount`를 `??`로 null과 구분해 보존하는데, UI에서 그 구분이 사라진다.
