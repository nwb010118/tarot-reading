# 공유 카드 이미지 + 결과 재현 링크 설계

- 이미지: `js/share-card.js`가 1080x1350 PNG를 캔버스로 그린다. 타로는 카드 이미지(역방향은 180도 회전), 그 외는 링 안에 이름과 아래 부제. 입력값·생년월일·약속은 넣지 않는다. 궁합 띠 제목의 "YYYY년생"은 제거한다.
- 공유 방식: 결과 화면에 "이미지로 공유", "링크 복사", 기존 "공유하기". 이미지는 `navigator.share({files})`, 미지원 시 PNG 다운로드.
- 재현 링크 `#share=<kind>&...`: tarot(cards, k=문구 시드), zodiac(z), ddi(a=띠 키), daily(k=기기 ID, d). 공통 c, b, p, d. 사주·궁합은 개인정보라 링크 없음.
- 문구 재현: 타로는 뽑을 때 문구 시드 `k`를 만들어 `createRng(['tarot', k])`로 문구를 고른다. 띠 시드는 출생연도가 아니라 띠 키 기준.
- 링크로 들어온 화면: 읽기 전용(기록·약속 없음), 상단 안내, 버튼은 "나도 운세 보기". 주소 값은 `parseShareHash`가 허용 목록으로 검증하고 실패하면 무시.
- 로직은 `js/share-logic.js`(buildShareHash, parseShareHash, wrapText), 테스트는 `tests/share-logic.test.js`.
- 범위 밖: 링크별 미리보기 이미지, 카카오 SDK, 사주·궁합 링크.
