// 공유용 이미지 카드(1080x1350 PNG)를 캔버스로 그린다. 입력값·약속 등 개인정보는 받지 않는다.
const SHARE_CARD_FONT = '"Malgun Gothic", "Apple SD Gothic Neo", -apple-system, sans-serif';

function loadShareImage(src) {
  return new Promise(function (resolve) {
    const img = new Image();
    img.onload = function () { resolve(img); };
    img.onerror = function () { resolve(null); };
    img.src = src;
  });
}

// spec: { title, lead, dateText, images: [{ src, reversed }], siteText }
function renderShareCard(spec) {
  const W = 1080;
  const H = 1350;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  return Promise.all((spec.images || []).map(function (i) { return loadShareImage(i.src); })).then(function (loaded) {
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#0b1422');
    bg.addColorStop(1, '#1f2a4a');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = 'rgba(240, 210, 140, 0.55)';
    for (let i = 0; i < 40; i += 1) {
      const x = (i * 197 + 61) % W;
      const y = (i * 131 + 23) % 360;
      ctx.beginPath();
      ctx.arc(x, y, i % 4 === 0 ? 2.4 : 1.4, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.textAlign = 'center';
    ctx.fillStyle = '#e8c982';
    ctx.font = '600 38px ' + SHARE_CARD_FONT;
    ctx.fillText('점집 · 마음을 비추는 곳', W / 2, 96);

    let y = 150;
    const images = loaded.filter(Boolean);
    if (images.length) {
      const cardH = 560;
      const widths = images.map(function (img) { return Math.round(cardH * img.width / img.height); });
      const gap = 36;
      const total = widths.reduce(function (a, b) { return a + b; }, 0) + gap * (images.length - 1);
      let x = (W - total) / 2;
      images.forEach(function (img, idx) {
        const info = spec.images[loaded.indexOf(img)];
        ctx.save();
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        ctx.shadowBlur = 30;
        if (info && info.reversed) {
          ctx.translate(x + widths[idx] / 2, y + cardH / 2);
          ctx.rotate(Math.PI);
          ctx.drawImage(img, -widths[idx] / 2, -cardH / 2, widths[idx], cardH);
        } else {
          ctx.drawImage(img, x, y, widths[idx], cardH);
        }
        ctx.restore();
        x += widths[idx] + gap;
      });
      y += cardH + 70;
    } else {
      ctx.strokeStyle = 'rgba(232, 201, 130, 0.5)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(W / 2, 360, 170, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(W / 2, 360, 140, 0, Math.PI * 2);
      ctx.stroke();
      const parts = String(spec.title).split(' · ');
      const name = parts[0];
      const sub = parts.slice(1).join(' · ');
      const measure = function (t) { return ctx.measureText(t).width; };
      ctx.fillStyle = '#e8c982';
      let size = 84;
      ctx.font = '700 ' + size + 'px ' + SHARE_CARD_FONT;
      while (size > 40 && measure(name) > 270) {
        size -= 4;
        ctx.font = '700 ' + size + 'px ' + SHARE_CARD_FONT;
      }
      // 공백이 있으면 단어 단위로 먼저 나눈다 (예: '양자리 × 양자리 / 궁합')
      let nameLines = wrapText(measure, name, 270, 2);
      const words = name.split(' ');
      if (words.length > 1 && measure(name) > 270) {
        let best = null;
        for (let cut = 1; cut < words.length; cut += 1) {
          const a = words.slice(0, cut).join(' ');
          const b = words.slice(cut).join(' ');
          const widest = Math.max(measure(a), measure(b));
          if (widest <= 270 && (!best || widest < best.widest)) best = { lines: [a, b], widest: widest };
        }
        if (best) nameLines = best.lines;
      }
      nameLines.forEach(function (line, i) {
        ctx.fillText(line, W / 2, 360 + (i - (nameLines.length - 1) / 2) * (size + 12) + size / 3);
      });
      if (sub) {
        ctx.font = '600 44px ' + SHARE_CARD_FONT;
        ctx.fillText(sub, W / 2, 610);
      }
      y = 720;
    }

    if (images.length) {
      ctx.fillStyle = '#e8c982';
      ctx.font = '700 52px ' + SHARE_CARD_FONT;
      wrapText(function (t) { return ctx.measureText(t).width; }, spec.title, 900, 1).forEach(function (line) {
        ctx.fillText(line, W / 2, y);
      });
      y += 80;
    }

    ctx.fillStyle = '#f3efe6';
    ctx.font = '500 44px ' + SHARE_CARD_FONT;
    const leadLines = wrapText(function (t) { return ctx.measureText(t).width; }, spec.lead, 860, images.length ? 4 : 5);
    leadLines.forEach(function (line, i) {
      ctx.fillText(line, W / 2, y + i * 68);
    });

    ctx.fillStyle = 'rgba(243, 239, 230, 0.6)';
    ctx.font = '400 30px ' + SHARE_CARD_FONT;
    ctx.fillText(spec.dateText, W / 2, H - 120);
    ctx.fillStyle = '#e8c982';
    ctx.font = '500 32px ' + SHARE_CARD_FONT;
    ctx.fillText(spec.siteText, W / 2, H - 66);

    return new Promise(function (resolve, reject) {
      canvas.toBlob(function (blob) { return blob ? resolve(blob) : reject(new Error('toBlob failed')); }, 'image/png');
    });
  });
}
