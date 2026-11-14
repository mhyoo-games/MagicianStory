// 얼굴 그림: 캐릭터의 서 있는 프레임을 크게 키워 그림으로 남긴다
import { heroSet, monsterSet, npcSet, petSet, cv } from './sheets.js';

const cache = new Map();
// kind: 'human'(look) · 'npc'(id, look) · 'mon'(id, model) · 'pet'(pet)
export function portrait(key, kind, data, id) {
  if (cache.has(key)) return cache.get(key);
  let url = '';
  try {
    const set = kind === 'pet' ? petSet(data) : kind === 'mon' ? monsterSet(id, data) : kind === 'npc' ? npcSet(id, data) : heroSet(data);
    const a = set.anims.idle, i = (a.down || a.side)[0], S = set.S, c = set.cols;
    const sx = (i % c) * S, sy = Math.floor(i / c) * S;
    const out = cv(96, 96), g = out.getContext('2d');
    const top = set.top, foot = set.ay, h = foot - top;
    const zoom = kind === 'pet' || h < 20 ? 4 : 3;
    // 사람은 머리·가슴, 작은 것은 몸 전체
    const view = kind === 'pet' || h < 22 ? h + 4 : 22;
    const srcH = Math.min(S, Math.ceil(96 / zoom)), srcW = srcH;
    const cy = kind === 'pet' || h < 22 ? top + h / 2 : top + view / 2 + 1;
    g.drawImage(set.atlas, sx + set.ax - srcW / 2, sy + cy - srcH / 2, srcW, srcH, 0, 0, srcW * zoom, srcH * zoom);
    if (set.faceLeft) { const f = cv(96, 96), fg = f.getContext('2d'); fg.translate(96, 0); fg.scale(-1, 1); fg.drawImage(out, 0, 0); url = f.toDataURL(); }
    else url = out.toDataURL();
  } catch (e) { console.warn(e); }
  cache.set(key, url); return url;
}
