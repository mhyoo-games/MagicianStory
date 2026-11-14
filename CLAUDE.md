# 이 저장소에서 작업할 때 지킬 것

매지션 스토리(MagicianStory) — 견습 마법사가 시험(전직)을 치르며 초급·중급·상급·익스퍼트로 크는 픽셀 탑뷰 액션 RPG. 조직 mhyoo-games, 주소 `https://mhyoo-games.github.io/MagicianStory/`. 사용자는 한국어로 대화합니다.

- 빌드 없는 정적 페이지: `index.html` + `js/` (ES 모듈) + `css/`. 화면은 canvas 2D, 창·HUD는 HTML(`js/ui.js`).
- **그림 파일 없음.** 모든 그림은 `js/pix.js`(안티앨리어싱 없는 픽셀 그리기) + `js/art.js`(사람 4방향·고양이·몬스터·용·마법·타일·아이콘)로 그린다. `js/sprites.js`가 프레임을 구워 캐시. 주인공 모습은 장비(모자·로브·지팡이)에 따라 바뀐다. 개발용 그림 모음: `tools/gallery.html`.
- 주인공·마을 사람·고양이 캐럿은 Pepper&Carrot(David Revoy, CC BY 4.0) 바탕 — 출처 표기(README·게임 안 크레딧·처음 화면)를 꼭 유지한다.
- 데이터: `js/data/skills.js`(200개: 9원소×22 + 공용 2, rank 0~4), `js/data/items.js`(장비 200개, 8단계, shop/drop/boss), `js/data/monsters.js`(lv로 능력치, role normal/mid/boss/exam, 보스 pattern), `js/data/story.js`(8장 · 퀘스트 단계 talk/kill/collect/mid/boss/exam · 대사 · 마을 사람).
- 규칙은 `js/rules.js` (화면과 상관없는 순수 계산: 능력치·피해·경험치·드랍·상점·이야기 진행·저장). 맵은 `js/world.js` (시드로 생성, 들판·던전·마을·마탑). 실시간 진행·전투·그리기는 `js/game.js`.
- 개수를 바꾸면 `tests/data.test.mjs`(스킬 200·장비 200·장마다 중간보스·보스·맵에서 보스 자리까지 길) 를, 숫자를 바꾸면 `tests/logic.test.mjs`(이야기 끝까지 진행, 장별 보스 잡는 시간 밸런스 — 표: `TABLE=1 node tests/logic.test.mjs`)를 맞춘다.
- 저장은 브라우저 localStorage `magicianstory_save_v1`. 저장 모양을 바꾸면 `fixSave`로 예전 저장을 고친다.
- `index.html`의 importmap에 모든 js 파일이 `?v=__V__`로 들어 있다. 파일을 더하면 importmap에도 더한다. CI(`.github/workflows/pages.yml`): 테스트 → `__V__`를 커밋 번호로 → Pages 배포.
- 화면·README에 실명을 넣지 않는다. 만든 사람은 "심심풀이". 다른 회사·게임 이름을 넣지 않는다(모티브가 된 옛 게임 이름도). 소스·저장소 링크를 이력서·게임 모음에 넣지 않는다.
- 게임을 바꾸면 이력서(minhyuk94.github.io `src/data/resume.json`의 `games`)와 게임 모음(mhyoo-games.github.io `games.json`)도 같은 뜻으로 맞춘다.
- 로컬 확인: `python3 -m http.server` 후 `index.html`. 콘솔에서 `__game`, `__R`로 상태를 볼 수 있다.
