# 이 저장소에서 작업할 때 지킬 것

매지션 스토리(MagicianStory) — 견습 마법사가 시험(전직)을 치르며 초급·중급·상급·익스퍼트로 크는 탑뷰 픽셀 액션 RPG. 조직 mhyoo-games, 주소 `https://mhyoo-games.github.io/MagicianStory/`. 사용자는 한국어로 대화합니다.

- 빌드 없는 정적 페이지: `index.html` + `js/` (ES 모듈) + `css/`. 그리기는 three.js(CDN)로 하지만 **비스듬한 평행 투영**(`js/engine/view.js`)이라 2D 픽셀처럼 보인다: 땅(x,z)은 그대로, 높이(y)는 화면 위쪽. 1칸 = 16px = 1m. 창·HUD는 HTML(`js/ui.js`), 숫자·이름표·동굴 어둠은 2D 캔버스(`js/engine/overlay.js`).
- 그림: `assets/px/` = Pixel Crawler(Anokolisa) 시트. 땅은 지역마다 한 장의 그림판에 자동 이음 타일로 찍는다(`js/engine/mapview.js`, 풀·돌·흙은 가운데 빈 고리 모양 타일, 절벽은 위면+얼굴). 사람은 맨몸 시트(Body_A)에 옷·머리·모자를 그려 입히고 지팡이·무기·손은 에셋 시트(weapon_wood·weapon_bone·hands)에서 잘라 쥐여 준다(`js/engine/sheets.js` dressFrame, WEAPON_PX). 소녀=긴 붉은 머리·원피스·넓은 모자, 소년=짧은 머리·웃옷+망토·고깔(`story.js` HEROES). 개발용 보기: `tools/chars.html`, 에셋 몬스터는 색만 바꿔 쓰며(`MON_PX`), 없는 몬스터·펫·마법 탄은 `js/engine/art.js`(코드 픽셀) + 검은 테두리. 캐릭터는 `js/engine/models.js`의 Actor(그림판 한 장 + 프레임 자리 옮기기).
- 에셋 약관: 따로 떼어 팔거나 나눠 주기 금지 (`assets/px/TERMS-Pixel-Crawler.txt`). 출처 표기(README·게임 안 크레딧·처음 화면)를 유지한다.
- 주인공·고양이 캐럿은 Pepper&Carrot(David Revoy, CC BY 4.0) 바탕 — 출처 표기(README·게임 안 크레딧·처음 화면)를 꼭 유지한다.
- 데이터: `js/data/skills.js`(56개: 9원소×6 + 블링크·마나 실드, 원소 특성, Lv.3 특성 A/B), `js/data/items.js`(장비 120 · 재료 · 제작법 · 강화표 +20), `js/data/pets.js`(16종 · 상자), `js/data/monsters.js`, `js/data/world.js`(이어진 25곳 · 테마), `js/data/story.js`(8장, 여러 퀘스트 종류).
- 규칙은 `js/rules.js` (화면과 상관없는 순수 계산). 맵은 `js/mapgen.js`(시드, 구간: 사냥터·퍼즐·블링크·보스방). 실시간 진행은 `js/game.js`, 스킬 모양은 `js/cast.js`, 보스 기믹은 `js/bosses.js`, 이펙트 `js/engine/fx.js`, 소리·음악 `js/audio.js`(코드로 작곡).
- 움직임은 방향키만. 나머지 키는 `s.keys`(단축키 설정)로 바꾼다. 키를 더하면 `rules.js`의 DEFAULT_KEYS·ACTION_NAME, `ui.js`의 ACTION_ORDER.
- 개수·숫자를 바꾸면 `tests/data.test.mjs`·`tests/logic.test.mjs`를 맞춘다 (`TABLE=1 node tests/logic.test.mjs`로 보스 밸런스 표).
- 저장은 localStorage, 저장 칸 3개(`rules.js` SAVE_SLOTS·slotKey: 1번 칸 = `magicianstory_save_v2`, 2·3번 = `_2`·`_3`). 지금 칸은 `game.slot`. 저장 모양을 바꾸면 `fixSave`로 예전 저장을 고친다.
- `index.html`의 importmap에 모든 js 파일이 `?v=__V__`로 들어 있다. 파일을 더하거나 지우면 `python3 tools/importmap.py`. CI(`.github/workflows/pages.yml`): 테스트 → `__V__`를 커밋 번호로 → Pages 배포.
- 화면·README에 실명을 넣지 않는다. 만든 사람은 "심심풀이". 다른 회사·게임 이름을 넣지 않는다(모티브가 된 옛 게임 이름도). 소스·저장소 링크를 이력서·게임 모음에 넣지 않는다.
- 게임을 바꾸면 이력서(minhyuk94.github.io `src/data/resume.json`의 `games`)와 게임 모음(mhyoo-games.github.io `games.json`)도 같은 뜻으로 맞춘다.
- 로컬 확인: `python3 -m http.server` 후 `index.html`. 콘솔에서 `__game`, `__R`로 상태를 볼 수 있다.
