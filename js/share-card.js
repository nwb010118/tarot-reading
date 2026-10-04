// 공유용 이미지 카드(1080x1350 PNG)를 캔버스로 그린다. 입력값·약속 등 개인정보는 받지 않는다.
const SHARE_CARD_FONT = '"Pretendard Variable", Pretendard, "Malgun Gothic", "Apple SD Gothic Neo", -apple-system, sans-serif';
const SHARE_CARD_SERIF = '"Noto Serif KR", "Nanum Myeongjo", AppleMyungjo, ' + SHARE_CARD_FONT;

function loadShareImage(src) {
  return new Promise(function (resolve) {
    const img = new Image();
    img.onload = function () { resolve(img); };
    img.onerror = function () { resolve(null); };
    img.src = src;
  });
}

// 화면 글꼴이 아직 안 받아졌으면 기다린다 (실패해도 기본 글꼴로 그린다)
function loadShareFonts() {
  if (!document.fonts || !document.fonts.load) return Promise.resolve();
  return Promise.all([
    document.fonts.load('600 80px "Noto Serif KR"'),
    document.fonts.load('500 44px "Pretendard Variable"')
  ]).catch(function () {});
}

// 공백 단위로 두 줄에 가장 고르게 나눈다 (예: '게자리 × 사수자리 / 궁합'). 안 되면 글자 단위로 줄바꿈.
function splitTitle(measure, text, maxWidth, maxLines) {
  if (measure(text) <= maxWidth) return [text];
  const words = text.split(' ');
  let best = null;
  for (let cut = 1; cut < words.length; cut += 1) {
    const a = words.slice(0, cut).join(' ');
    const b = words.slice(cut).join(' ');
    const widest = Math.max(measure(a), measure(b));
    if (widest <= maxWidth && (!best || widest < best.widest)) best = { lines: [a, b], widest: widest };
  }
  return best ? best.lines : wrapText(measure, text, maxWidth, maxLines);
}

// spec: { title, lead, dateText, images: [{ src, reversed }], siteText }
function renderShareCard(spec) {
  const W = 1080;
  const H = 1350;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext && canvas.getContext('2d');
  if (!ctx) return Promise.reject(new Error('canvas unavailable'));
  const measure = function (t) { return ctx.measureText(t).width; };

  return Promise.all([loadShareFonts()].concat((spec.images || []).map(function (i) { return loadShareImage(i.src); }))).then(function (results) {
    const loaded = results.slice(1);
    const images = loaded.filter(Boolean);

    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#0d1828');
    bg.addColorStop(0.6, '#0a121e');
    bg.addColorStop(1, '#152238');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);
    const glow = ctx.createRadialGradient(W / 2, H * 0.42, 0, W / 2, H * 0.42, 560);
    glow.addColorStop(0, 'rgba(216, 192, 143, 0.13)');
    glow.addColorStop(1, 'rgba(216, 192, 143, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = 'rgba(240, 220, 174, 0.55)';
    for (let i = 0; i < 46; i += 1) {
      const x = (i * 197 + 61) % W;
      const y = (i * 131 + 23) % H;
      if (y > 170 && y < H - 190 && x > 120 && x < W - 120) continue;
      ctx.beginPath();
      ctx.arc(x, y, i % 5 === 0 ? 2.6 : 1.4, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#d8c08f';
    ctx.font = '600 34px ' + SHARE_CARD_SERIF;
    ctx.fillText('가만점방 · 마음을 비추는 곳', W / 2, 104);
    ctx.fillStyle = 'rgba(216, 192, 143, 0.35)';
    ctx.fillRect(W / 2 - 40, 130, 80, 2);

    // 내용 블록: 높이를 먼저 계산해 머리글(150)과 바닥글(1170) 사이 가운데에 놓는다
    const parts = String(spec.title).split(' · ');
    const titleText = images.length ? spec.title : parts[0];
    const subText = images.length ? '' : parts.slice(1).join(' · ');
    const titleSize = images.length ? 56 : 78;
    ctx.font = '600 ' + titleSize + 'px ' + SHARE_CARD_SERIF;
    const titleLines = splitTitle(measure, titleText, 900, 2);
    const leadSize = 42;
    const leadGap = 66;
    ctx.font = '500 ' + leadSize + 'px ' + SHARE_CARD_FONT;
    const leadLines = spec.lead ? wrapText(measure, spec.lead, 860, images.length ? 4 : 7) : [];

    const cardH = images.length === 1 ? 560 : 470;
    const blocks = [];
    if (images.length) blocks.push({ kind: 'cards', h: cardH, after: 64 });
    else blocks.push({ kind: 'emblem', h: 120, after: 52 });
    blocks.push({ kind: 'title', h: titleLines.length * (titleSize + 18) - 18, after: subText ? 22 : 44 });
    if (subText) blocks.push({ kind: 'sub', h: 40, after: 44 });
    if (leadLines.length) blocks.push({ kind: 'rule', h: 2, after: 46 });
    if (leadLines.length) blocks.push({ kind: 'lead', h: (leadLines.length - 1) * leadGap + leadSize, after: 0 });
    const total = blocks.reduce(function (sum, b) { return sum + b.h + b.after; }, 0);
    let y = 150 + Math.max(0, (1170 - 150 - total) / 2);

    blocks.forEach(function (b) {
      if (b.kind === 'cards') {
        const widths = images.map(function (img) { return Math.round(cardH * img.width / img.height); });
        const gap = 32;
        const sum = widths.reduce(function (a, c) { return a + c; }, 0) + gap * (images.length - 1);
        let x = (W - sum) / 2;
        images.forEach(function (img, idx) {
          const info = spec.images[loaded.indexOf(img)];
          ctx.save();
          ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
          ctx.shadowBlur = 36;
          ctx.shadowOffsetY = 18;
          if (info && info.reversed) {
            ctx.translate(x + widths[idx] / 2, y + cardH / 2);
            ctx.rotate(Math.PI);
            ctx.drawImage(img, -widths[idx] / 2, -cardH / 2, widths[idx], cardH);
          } else {
            ctx.drawImage(img, x, y, widths[idx], cardH);
          }
          ctx.restore();
          ctx.strokeStyle = 'rgba(216, 192, 143, 0.45)';
          ctx.lineWidth = 2;
          ctx.strokeRect(x, y, widths[idx], cardH);
          x += widths[idx] + gap;
        });
      } else if (b.kind === 'emblem') {
        // 달과 별: 홈 화면의 장식과 같은 금색 선
        const cx = W / 2;
        const cy = y + 60;
        ctx.strokeStyle = 'rgba(216, 192, 143, 0.45)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, cy, 58, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = '#e8cf98';
        ctx.beginPath();
        ctx.arc(cx - 4, cy, 26, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#0c1624';
        ctx.beginPath();
        ctx.arc(cx + 8, cy - 8, 23, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#f0dcae';
        ctx.beginPath();
        ctx.arc(cx + 72, cy - 44, 3, 0, Math.PI * 2);
        ctx.arc(cx - 70, cy + 40, 2.2, 0, Math.PI * 2);
        ctx.fill();
      } else if (b.kind === 'title') {
        ctx.fillStyle = '#f0e4c8';
        ctx.font = '600 ' + titleSize + 'px ' + SHARE_CARD_SERIF;
        titleLines.forEach(function (line, i) {
          ctx.fillText(line, W / 2, y + titleSize * 0.82 + i * (titleSize + 18));
        });
      } else if (b.kind === 'sub') {
        ctx.fillStyle = '#d8c08f';
        ctx.font = '500 36px ' + SHARE_CARD_FONT;
        ctx.fillText(subText, W / 2, y + 32);
      } else if (b.kind === 'rule') {
        const line = ctx.createLinearGradient(W / 2 - 200, 0, W / 2 + 200, 0);
        line.addColorStop(0, 'rgba(216, 192, 143, 0)');
        line.addColorStop(0.5, 'rgba(216, 192, 143, 0.6)');
        line.addColorStop(1, 'rgba(216, 192, 143, 0)');
        ctx.fillStyle = line;
        ctx.fillRect(W / 2 - 200, y, 400, 2);
      } else if (b.kind === 'lead') {
        ctx.fillStyle = '#ece6da';
        ctx.font = '500 ' + leadSize + 'px ' + SHARE_CARD_FONT;
        leadLines.forEach(function (line, i) {
          ctx.fillText(line, W / 2, y + leadSize * 0.85 + i * leadGap);
        });
      }
      y += b.h + b.after;
    });

    ctx.fillStyle = 'rgba(236, 230, 218, 0.55)';
    ctx.font = '400 30px ' + SHARE_CARD_FONT;
    ctx.fillText(spec.dateText, W / 2, H - 116);
    ctx.fillStyle = '#d8c08f';
    ctx.font = '500 32px ' + SHARE_CARD_FONT;
    ctx.fillText(spec.siteText, W / 2, H - 66);

    return new Promise(function (resolve, reject) {
      canvas.toBlob(function (blob) { return blob ? resolve(blob) : reject(new Error('toBlob failed')); }, 'image/png');
    });
  });
}
