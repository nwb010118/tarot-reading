# 카드 목록(홈·타로 백과 허브)에 90px로 보이는 카드용 작은 이미지(가로 180px)를 만든다.
# 원본 images/*.webp(가로 480px)는 그대로 두고 images/thumbs/에 같은 이름으로 저장한다.
# 실행: python scripts/make-card-thumbs.py  (Pillow 필요)
import os
from PIL import Image

SRC = 'images'
OUT = os.path.join(SRC, 'thumbs')
WIDTH = 180

os.makedirs(OUT, exist_ok=True)
for name in sorted(os.listdir(SRC)):
    if not name.endswith('.webp'):
        continue
    im = Image.open(os.path.join(SRC, name))
    height = round(im.size[1] * WIDTH / im.size[0])
    im.resize((WIDTH, height), Image.LANCZOS).save(os.path.join(OUT, name), 'WEBP', quality=78, method=6)
print('thumbs:', len([n for n in os.listdir(OUT) if n.endswith('.webp')]))
