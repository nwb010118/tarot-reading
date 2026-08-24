# 법적 고지 페이지 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** "점집" 앱에 개인정보처리방침·이용약관·면책조항을 담은 `legal.html` 페이지를 추가하고, 기존 `index.html`에 상시 노출 면책 문구와 이 페이지로 연결되는 푸터 링크를 추가한다.

**Architecture:** 순수 정적 HTML 추가. 새 로직·데이터 파일 없음. `legal.html`은 기존 `css/style.css`를 그대로 재사용해 톤을 통일하고, `index.html`에는 헤더 아래 상시 문구 한 줄과 페이지 하단 푸터만 추가한다.

**Tech Stack:** 순수 HTML/CSS(빌드 도구 없음), 기존 프로젝트와 동일.

## Global Constraints

- 모든 신규 텍스트는 한국어.
- 개인정보처리방침은 "수집하는 개인정보 없음"을 명시한다 — 실제로 코드에 서버 전송 지점이 없음을 이미 확인했으므로 이 문구는 사실에 부합한다(`docs/superpowers/specs/2026-08-24-legal-pages-design.md`의 "사실관계 확인" 참고).
- 문의처 이메일은 정확히 `nwb010118@gmail.com`이다.
- 시행일자는 정확히 "2026년 8월 24일"이다.
- 음력 변환 데이터의 오픈소스 출처(MIT License, usingsky/korean_lunar_calendar_js)는 이용약관에 명시하되, `data/lunar-table.js` 상단 주석의 기존 출처 표기와 내용이 모순되지 않아야 한다.
- 새 스크립트나 로직 파일은 추가하지 않는다(순수 정적 콘텐츠).

---

## Task 1: `legal.html` 페이지 작성

**Files:**
- Create: `legal.html`
- Modify: `css/style.css` (파일 끝에 `.legal-page`/`.legal-section` 관련 스타일 추가)

**Interfaces:**
- Consumes: 기존 `css/style.css`의 전역 스타일(`body`, `#app`, `header h1` 등) — 그대로 재사용, 수정하지 않음
- Produces: `legal.html`이 갖는 앵커 `id="privacy"`, `id="terms"`, `id="disclaimer"` — Task 2의 푸터 링크(`legal.html#privacy` 등)가 이 id들을 그대로 참조한다

- [ ] **Step 1: `legal.html` 작성**

```html
<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>법적 고지 - 점집</title>
<link rel="stylesheet" href="css/style.css">
</head>
<body>
<div id="app" class="legal-page">
  <header>
    <h1>점집</h1>
  </header>

  <p><a href="index.html">← 점집으로 돌아가기</a></p>

  <section id="privacy" class="legal-section">
    <h2>개인정보처리방침</h2>
    <p>본 서비스("점집", 이하 "서비스")는 개인이 비영리 목적으로 운영하는 정적 웹사이트입니다.</p>

    <h3>수집하는 개인정보</h3>
    <p><strong>서비스는 어떠한 개인정보도 수집하지 않습니다.</strong> 생년월일시, 성별, 궁합 상대방 정보 등 이용자가 입력하는 모든 값은 서비스를 운영하는 서버로 전송되지 않으며, 이용자가 사용 중인 기기의 브라우저(localStorage)에만 저장됩니다. 운영자를 포함한 누구도 이 데이터에 접근할 수 없습니다.</p>

    <h3>쿠키 및 추적 도구</h3>
    <p>서비스는 쿠키, 분석 도구(예: Google Analytics), 광고 스크립트, 추적 픽셀을 사용하지 않습니다.</p>

    <h3>저장된 데이터의 삭제</h3>
    <p>이용자는 "지난 기록" 화면의 "전체 삭제" 버튼으로 저장된 데이터를 직접 삭제할 수 있으며, 브라우저의 사이트 데이터를 삭제해도 함께 삭제됩니다.</p>

    <h3>호스팅 안내</h3>
    <p>서비스는 GitHub Pages를 통해 호스팅됩니다. 서비스 자체는 개인정보를 수집하지 않지만, GitHub의 인프라 운영 과정에서 발생하는 접속 로그 등은 운영자의 통제 범위 밖에 있습니다. 자세한 내용은 <a href="https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement" target="_blank" rel="noopener noreferrer">GitHub 개인정보처리방침</a>을 참고해주세요.</p>

    <h3>문의처</h3>
    <p>개인정보처리방침에 대한 문의는 아래 이메일로 연락해주세요.<br>이메일: nwb010118@gmail.com</p>

    <h3>방침의 변경</h3>
    <p>본 방침이 변경되는 경우 이 페이지에 반영됩니다.</p>

    <p class="legal-date">시행일자: 2026년 8월 24일</p>
  </section>

  <section id="terms" class="legal-section">
    <h2>이용약관</h2>

    <h3>서비스의 성격</h3>
    <p>본 서비스는 무료로 제공되는 오락 목적의 웹사이트이며, 회원가입이나 결제 기능이 없습니다.</p>

    <h3>서비스의 변경 및 중단</h3>
    <p>운영자는 사전 예고 없이 서비스의 내용을 변경하거나 서비스 제공을 중단할 수 있습니다.</p>

    <h3>저작권</h3>
    <p>서비스에 포함된 콘텐츠의 저작권은 운영자에게 있습니다. 다만 음력-양력 변환에 사용된 데이터는 별도의 오픈소스 라이선스(MIT License, usingsky/korean_lunar_calendar_js)를 따르며, 해당 출처는 소스 코드에 명시되어 있습니다.</p>

    <h3>이용자의 의무</h3>
    <p>이용자는 본 서비스를 불법적인 목적으로 사용하거나, 서비스의 정상적인 운영을 방해하거나, 타인에게 피해를 주는 방식으로 사용해서는 안 됩니다.</p>

    <h3>책임의 제한</h3>
    <p>서비스 이용과 관련된 책임의 범위는 아래 면책조항을 따릅니다.</p>

    <h3>준거법</h3>
    <p>본 약관은 대한민국 법령에 따라 해석됩니다.</p>

    <p class="legal-date">시행일자: 2026년 8월 24일</p>
  </section>

  <section id="disclaimer" class="legal-section">
    <h2>면책조항</h2>

    <p>본 서비스에서 제공하는 타로, 별자리, 띠운세, 사주, 궁합 등 모든 콘텐츠는 전통 이론과 무작위 요소에 기반한 <strong>오락 목적</strong>의 콘텐츠이며, 그 정확성, 완전성, 특정 목적에의 적합성을 보장하지 않습니다.</p>

    <p>본 서비스의 콘텐츠는 법률, 의료, 재정, 심리 상담 등 전문적인 조언을 대체하지 않습니다. 중요한 결정을 내리기 전에는 반드시 관련 분야의 전문가와 상담하시기 바랍니다.</p>

    <p>이용자가 본 서비스의 콘텐츠를 근거로 내린 판단이나 행동으로 인해 발생한 손해에 대해, 운영자는 관계 법령이 허용하는 최대한의 범위에서 책임을 지지 않습니다.</p>
  </section>
</div>
</body>
</html>
```

- [ ] **Step 2: `css/style.css` 끝에 legal 페이지 스타일 추가**

파일 맨 끝(`.element-summary { ... }` 다음)에 추가:

```css

.legal-page a { color: #d4af37; }
.legal-page > p:first-of-type { margin-bottom: 20px; }

.legal-section { margin-bottom: 32px; padding-bottom: 24px; border-bottom: 1px solid #4a3a68; }
.legal-section:last-child { border-bottom: none; }
.legal-section h2 { color: #d4af37; margin-bottom: 12px; }
.legal-section h3 { color: #c9bde0; font-size: 15px; margin: 16px 0 6px; }
.legal-section p { font-size: 14px; line-height: 1.6; margin: 0 0 10px; }
.legal-date { color: #c9bde0; font-size: 12px; margin-top: 16px; }
```

- [ ] **Step 3: 필수 앵커 id와 필수 문구가 모두 존재하는지 확인**

Run: `grep -c 'id="privacy"\|id="terms"\|id="disclaimer"' legal.html`
Expected: `3`

Run: `grep -c 'nwb010118@gmail.com' legal.html`
Expected: `1`

Run: `grep -c '2026년 8월 24일' legal.html`
Expected: `2` (개인정보처리방침, 이용약관 각각 1개씩)

- [ ] **Step 4: Commit**

```bash
git add legal.html css/style.css
git commit -m "feat(legal): add privacy policy, terms, and disclaimer page"
```

---

## Task 2: `index.html`에 상시 면책 문구와 푸터 연결

**Files:**
- Modify: `index.html`
- Modify: `css/style.css`

**Interfaces:**
- Consumes: Task 1이 만든 `legal.html`의 앵커 `#privacy`/`#terms`/`#disclaimer`
- Produces: 없음(최종 통합 지점)

- [ ] **Step 1: 헤더 아래 상시 면책 문구 추가**

`index.html`에서 기존:

```html
<body>
<div id="app">
  <header>
    <h1>점집</h1>
  </header>

  <section id="screen-start">
```

다음으로 교체:

```html
<body>
<div id="app">
  <header>
    <h1>점집</h1>
  </header>

  <p id="site-disclaimer">⚠ 재미로만 봐주세요 — 오락 목적이며 전문적인 법률·의료·재정·심리 상담을 대체하지 않습니다.</p>

  <section id="screen-start">
```

- [ ] **Step 2: 푸터 추가**

`index.html`에서 기존(`#history-modal` 블록과 `#app`을 닫는 부분):

```html
  <div id="history-modal" class="hidden">
    <div class="modal-content">
      <h2>지난 기록</h2>
      <div id="history-list"></div>
      <div class="modal-actions">
        <button type="button" id="clear-history-button">전체 삭제</button>
        <button type="button" id="history-close-button">닫기</button>
      </div>
    </div>
  </div>
</div>

<script src="data/tarot-data.js"></script>
```

다음으로 교체:

```html
  <div id="history-modal" class="hidden">
    <div class="modal-content">
      <h2>지난 기록</h2>
      <div id="history-list"></div>
      <div class="modal-actions">
        <button type="button" id="clear-history-button">전체 삭제</button>
        <button type="button" id="history-close-button">닫기</button>
      </div>
    </div>
  </div>

  <footer id="site-footer">
    <a href="legal.html#privacy">개인정보처리방침</a>
    <a href="legal.html#terms">이용약관</a>
    <a href="legal.html#disclaimer">면책조항</a>
  </footer>
</div>

<script src="data/tarot-data.js"></script>
```

- [ ] **Step 3: `css/style.css`에 문구·푸터 스타일 추가**

Task 1에서 추가한 legal 스타일 블록 뒤에 이어서 추가:

```css

#site-disclaimer {
  text-align: center;
  font-size: 12px;
  color: #c9bde0;
  margin: -8px 0 20px;
}

#site-footer {
  display: flex;
  justify-content: center;
  gap: 16px;
  margin-top: 32px;
  padding-top: 16px;
  border-top: 1px solid #4a3a68;
  font-size: 12px;
}

#site-footer a { color: #c9bde0; text-decoration: none; }
#site-footer a:hover { color: #d4af37; }
```

- [ ] **Step 4: 신택스/구조 확인**

Run: `grep -c 'id="site-disclaimer"' index.html`
Expected: `1`

Run: `grep -c 'legal.html#privacy\|legal.html#terms\|legal.html#disclaimer' index.html`
Expected: `3`

- [ ] **Step 5: 기존 회귀 테스트 재실행 (이번 변경은 로직 없음 — 영향 없어야 함)**

Run: `node tests/tarot-data.test.js && node tests/deck-logic.test.js && node tests/history-store.test.js && node tests/saju-calc.test.js && node tests/lunar-convert.test.js && node tests/saju-data.test.js && node tests/compatibility-calc.test.js`
Expected: 전부 통과, 에러 없음

- [ ] **Step 6: 브라우저에서 수동 확인**

로컬 정적 서버로 `index.html`을 열고:
1. 헤더 바로 아래 "⚠ 재미로만 봐주세요..." 문구가 보이는지 확인
2. 모드를 바꿔가며(타로/별자리/띠운세/사주/궁합) 문구가 계속 보이는지 확인
3. 페이지 최하단 푸터의 "개인정보처리방침" 링크 클릭 → `legal.html`로 이동하며 개인정보처리방침 섹션으로 스크롤되는지 확인
4. 뒤로 가서 "이용약관", "면책조항" 링크도 각각 확인
5. `legal.html` 상단 "← 점집으로 돌아가기" 링크 클릭 → `index.html`로 정상 복귀하는지 확인
6. 콘솔에 에러가 없는지 확인

Expected: 위 6가지 모두 기대한 대로 동작

- [ ] **Step 7: Commit**

```bash
git add index.html css/style.css
git commit -m "feat(legal): link disclaimer banner and footer into main page"
```
