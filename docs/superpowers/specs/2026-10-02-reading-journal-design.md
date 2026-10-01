# 리딩 일기 + 연속 방문 설계

결과 화면에서 실천 약속을 한 줄로 남기고, 실천 기간이 지나면 홈에서 "해봤나요?"를 묻는다.

- 데이터: `tarot_history` 항목에 `id`와 `promise { text, status(pending|done|partial|skipped), dueDate, answeredAt }` 추가. `updateReading(storage, id, patch)` 신설.
- 약속하기: 실천 안내 박스 아래 "이 실천을 약속할게요" → 실천 안내 문장이 채워진 한 줄 입력 → 저장. 궁합은 실천 안내가 없어 제외.
- 확인일: 실천 기간별 오늘 +1, 이번주 +7, 이번달 +30, 3개월 +90, 6개월 +180, 1년 +365일.
- 홈 "약속 확인" 카드: 확인일이 지난 pending 약속 최대 3개, 했어요/조금 했어요/못 했어요 버튼, 비난 없는 한 줄 응답.
- 지난 기록: 약속 문장과 상태 표시.
- 연속 방문: `jeomjip_visits`에 최근 60일 방문 날짜 기록, 오늘의 한 장 카드에 2일 이상일 때 "N일 연속 방문 중이에요."
- 순수 로직은 `js/journal-logic.js`, 테스트는 `tests/journal-logic.test.js`.
- 범위 밖: 푸시 알림, 내보내기, 기기 간 동기화, 과거 기록 소급.
