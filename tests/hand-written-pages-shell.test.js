// index/about/legal/404/contact/faq는 손으로 직접 관리하는 파일이라(생성 페이지와 달리
// render-*.js 템플릿을 거치지 않음), nav/footer가 다른 페이지와 어긋나도 잡아줄 테스트가
// 따로 없었다. 이 파일이 6개 손작성 페이지 전체의 공통 nav/footer 구조를 지킨다.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const HAND_WRITTEN_PAGES = ['index.html', 'about.html', 'legal.html', '404.html', 'contact.html', 'faq.html'];

const EXPECTED_NAV_LINKS = [
  { href: 'tarot/index.html', label: '타로 카드 백과사전' },
  { href: 'guides/index.html', label: '운세 가이드' },
  { href: 'about.html', label: '소개' }
];

const EXPECTED_FOOTER_LINKS = [
  { href: 'about.html', label: '소개' },
  { href: 'contact.html', label: '문의하기' },
  { href: 'faq.html', label: '자주 묻는 질문' },
  { href: 'legal.html#privacy', label: '개인정보처리방침' },
  { href: 'legal.html#terms', label: '이용약관' },
  { href: 'legal.html#disclaimer', label: '면책조항' }
];

HAND_WRITTEN_PAGES.forEach(function (file) {
  const html = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');

  EXPECTED_NAV_LINKS.forEach(function (link) {
    assert.ok(
      html.includes('<a href="' + link.href + '">' + link.label + '</a>'),
      file + ' nav must include <a href="' + link.href + '">' + link.label + '</a>'
    );
  });

  EXPECTED_FOOTER_LINKS.forEach(function (link) {
    assert.ok(
      html.includes('<a href="' + link.href + '">' + link.label + '</a>'),
      file + ' footer must include <a href="' + link.href + '">' + link.label + '</a>'
    );
  });

  assert.ok(
    html.includes('<p id="site-disclaimer">운세는 가볍게, 선택은 당신답게.<br>오락 목적의 콘텐츠이며 전문적인 법률·의료·재정·심리 상담을 대체하지 않습니다.</p>'),
    file + ' must include the site-wide disclaimer paragraph'
  );

  // nav의 About/소개 표기와 footer의 소개 표기가 서로 어긋나지 않도록.
  assert.ok(!html.includes('>About<'), file + ' must not use the English "About" label');
});
