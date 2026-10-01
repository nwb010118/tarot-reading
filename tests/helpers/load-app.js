// jsdom으로 index.html을 열어 실제 스크립트를 실행한다. 화면 흐름 테스트 전용 (개발 의존성 jsdom 필요).
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const ORIGIN = 'http://localhost';

function tryLoadJsdom() {
  try {
    return require('jsdom');
  } catch (e) {
    return null;
  }
}

async function loadApp(options) {
  const jsdom = tryLoadJsdom();
  if (!jsdom) return null;
  const opts = options || {};
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

  // 같은 출처(localhost)의 요청은 로컬 파일로 응답한다. css와 이미지는 빈 응답으로 대신한다.
  const interceptor = jsdom.requestInterceptor(function (request) {
    const url = new URL(request.url);
    const pathname = decodeURIComponent(url.pathname).replace(/^\//, '');
    const type = /\.js$/.test(pathname) ? 'application/javascript' : /\.css$/.test(pathname) ? 'text/css' : 'application/octet-stream';
    if (/\.(css|webp|jpg|svg|png)$/.test(pathname)) {
      return new Response('', { headers: { 'Content-Type': type } });
    }
    const file = path.join(ROOT, pathname);
    if (!fs.existsSync(file)) return new Response('missing', { status: 404 });
    return new Response(fs.readFileSync(file), { headers: { 'Content-Type': type } });
  });

  const errors = [];
  const dom = new jsdom.JSDOM(html, {
    url: ORIGIN + '/' + (opts.hash || ''),
    runScripts: 'dangerously',
    resources: { interceptors: [interceptor] },
    pretendToBeVisual: true,
    beforeParse(window) {
      window.matchMedia = function () {
        return { matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} };
      };
      window.Element.prototype.scrollIntoView = function () {};
      window.__copied = null;
      Object.defineProperty(window.navigator, 'clipboard', {
        value: { writeText: function (text) { window.__copied = text; return Promise.resolve(); } },
        configurable: true
      });
      Object.keys(opts.storage || {}).forEach(function (key) {
        window.localStorage.setItem(key, opts.storage[key]);
      });
      window.addEventListener('error', function (event) { errors.push(String(event.message)); });
    }
  });

  await new Promise(function (resolve) {
    if (dom.window.document.readyState === 'complete') resolve();
    else dom.window.addEventListener('load', resolve);
  });
  await wait(50);

  const window = dom.window;
  const doc = window.document;
  const q = function (selector) { return doc.querySelector(selector); };
  return {
    window: window,
    doc: doc,
    errors: errors,
    q: q,
    qa: function (selector) { return Array.from(doc.querySelectorAll(selector)); },
    text: function (selector) { const el = q(selector); return el ? el.textContent : ''; },
    visible: function (selector) { const el = q(selector); return !!el && !el.classList.contains('hidden'); },
    click: function (selector) { const el = typeof selector === 'string' ? q(selector) : selector; if (!el) throw new Error('missing: ' + selector); el.click(); },
    type: function (selector, value) {
      const el = q(selector);
      if (!el) throw new Error('missing: ' + selector);
      el.value = value;
      el.dispatchEvent(new window.Event('input', { bubbles: true }));
      el.dispatchEvent(new window.Event('change', { bubbles: true }));
    },
    close: function () { window.close(); }
  };
}

function wait(ms) {
  return new Promise(function (resolve) { setTimeout(resolve, ms); });
}

module.exports = { loadApp, wait, jsdomAvailable: function () { return !!tryLoadJsdom(); } };
