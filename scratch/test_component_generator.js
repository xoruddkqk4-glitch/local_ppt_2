global.window = global;
require('../designs/options.js');

const ARCHETYPE_MAP = {
  '8-bit-orbit': 'pixel',
  'retro-zine': 'pixel',
  'sakura-chroma': 'pixel',
  'long-table': 'pixel',

  'retro-windows': 'windows',

  'block-frame': 'brutal',
  'brutal': 'brutal',
  'controlled-brutal': 'brutal',
  'bold-poster': 'brutal',
  'peoples-platform': 'brutal',
  'stencil-tablet': 'brutal',

  'clay': 'clay',
  'tactile-minimal': 'clay',
  'playful': 'clay',

  'pin-and-paper': 'paper',
  'scatterbrain': 'paper',
  'mat': 'paper',

  'bauhaus': 'bauhaus',
  'functional-bauhaus': 'bauhaus',
  'swiss': 'bauhaus',
  'swiss-grid': 'bauhaus',
  'soft-minimal': 'bauhaus',

  'cobalt-grid': 'tech',
  'cartesian': 'tech',
  'raw-grid': 'tech',
  'neo-grid-bold': 'tech',
  'blue-professional': 'tech',
  'studio': 'tech',
  'creative-mode': 'tech',

  'biennale-yellow': 'editorial',
  'broadside': 'editorial',
  'editorial-forest': 'editorial',
  'editorial-tri-tone': 'editorial',
  'emerald-editorial': 'editorial',
  'grove': 'editorial',
  'monochrome': 'editorial',
  'signal': 'editorial',
  'soft-editorial': 'editorial',
  'vellum': 'editorial',
  'coral': 'editorial',
  'daisy-days': 'editorial',
  'pink-script': 'editorial',
  'capsule': 'editorial',
  'skeuo': 'editorial'
};

const SPECIFIC_COMPONENTS = {
  '8-bit-orbit': [
    { id: 'sig-8bit-start', name: '🎮 픽셀 버튼 (Start)', icon: '🎮', w: 24, h: 9, html: '<div class="sig-comp pbtn">START ▶</div>' },
    { id: 'sig-8bit-coin', name: '🕹️ 픽셀 버튼 (Coin)', icon: '🕹️', w: 26, h: 9, html: '<div class="sig-comp pbtn pink">INSERT COIN ✦</div>' },
    { id: 'sig-8bit-hp', name: '🔋 픽셀 체력 게이지', icon: '🔋', w: 32, h: 10, html: '<div class="sig-comp pbar-box"><div class="pbar-label"><span>HP GAUGE</span><span>85 / 100</span></div><div class="pbar-track"><div class="pbar-fill" style="width: 85%;"></div></div></div>' },
    { id: 'sig-8bit-chip', name: '🏷️ 네온 픽셀 칩', icon: '🏷️', w: 25, h: 8, html: '<div class="sig-comp chip">[ LEVEL 01 : STAGE ]</div>' },
    { id: 'sig-8bit-crt', name: '📺 CRT 터미널 창', icon: '📺', w: 42, h: 25, html: '<div class="sig-comp crt-box"><div class="br tl"></div><div class="br brr"></div><div class="crt-title">SYSTEM NOTICE</div><div class="crt-body">MISSION OBJECTIVE ACQUIRED.<br>READY FOR NEXT DEPLOYMENT.</div></div>' },
    { id: 'sig-8bit-qline', name: '🟡 픽셀 쿼츠 라인', icon: '🟡', w: 30, h: 5, html: '<div class="sig-comp qline-bar"><span class="qline"></span><span class="qline-text">CHAPTER 01</span></div>' }
  ],
  'retro-windows': [
    { id: 'sig-win-window', name: '🪟 시스템 대화상자', icon: '🪟', w: 42, h: 28, html: '<div class="sig-comp win"><div class="tb"><div class="ic">ℹ️</div><div class="fn">Notice.exe</div><div class="wb"><i>_</i><i>□</i><i>✕</i></div></div><div class="body"><div class="gbox"><span class="gt">안내 (Notice)</span>새로운 시스템 작업이 완료되었습니다.<br>데이터를 안전하게 보관하세요.</div><div class="btn-row" style="display:flex; justify-content:flex-end; gap:8px; margin-top:8px;"><button class="btn">확인 (OK)</button><button class="btn">취소</button></div></div></div>' },
    { id: 'sig-win-btn', name: '🔘 3D 볼록 버튼', icon: '🔘', w: 20, h: 8, html: '<button class="sig-comp win btn">확인 (OK)</button>' },
    { id: 'sig-win-prog', name: '📊 분할 진행률 막대', icon: '📊', w: 34, h: 10, html: '<div class="sig-comp win-prog-wrap"><div class="win-prog-lbl">진행 상태 (Copying... 70%)</div><div class="prog"><span class="pf" style="width: 70%;"></span></div></div>' },
    { id: 'sig-win-alert', name: '⚠️ 시스템 경고창', icon: '⚠️', w: 36, h: 18, html: '<div class="sig-comp win-alert-box"><div class="win-alert-icon">⚠️</div><div class="win-alert-content"><strong>시스템 경고</strong><p>작업을 계속하기 전에 설정을 확인하십시오.</p></div></div>' },
    { id: 'sig-win-marq', name: '📜 클래식 마키 전광판', icon: '📜', w: 36, h: 8, html: '<div class="sig-comp marq"><span>★ LOCAL PPT 2.0 SYSTEM READY · PRESS OK TO PROCEED ★</span></div>' }
  ],
  'block-frame': [
    { id: 'sig-brutal-pk', name: '🏷️ 핑크 알약 배지', icon: '🏷️', w: 24, h: 8, html: '<div class="sig-comp pill pk">HOT TOPIC ✦</div>' },
    { id: 'sig-brutal-yel', name: '🏷️ 옐로우 알약 배지', icon: '🏷️', w: 24, h: 8, html: '<div class="sig-comp pill yel">KEY INSIGHT ★</div>' },
    { id: 'sig-brutal-card', name: '📐 코너 브래킷 카드', icon: '📐', w: 38, h: 26, html: '<div class="sig-comp cb-card"><div class="cb tl"></div><div class="cb br"></div><strong class="cb-title">핵심 메시지</strong><p class="cb-desc">모서리에 볼드한 L자 브래킷이 적용된 네오 브루탈리즘 강조 카드입니다.</p></div>' },
    { id: 'sig-brutal-stripe', name: '🚧 사선 경고 바', icon: '🚧', w: 30, h: 6, html: '<div class="sig-comp stripe-wrap"><div class="stripe"></div><span class="stripe-text">WARNING // CAUTION</span></div>' },
    { id: 'sig-brutal-tab', name: '📌 -3° 틸트 스티커', icon: '📌', w: 22, h: 9, html: '<div class="sig-comp tab-sticker">NEW 2026 ✦</div>' },
    { id: 'sig-brutal-cube', name: '⬛ 볼드 스텝 큐브', icon: '⬛', w: 12, h: 12, html: '<div class="sig-comp ln-cube">01</div>' }
  ],
  'clay': [
    { id: 'sig-clay-pill', name: '☁️ 3D 클레이 버튼', icon: '☁️', w: 24, h: 9, html: '<div class="sig-comp clay-pill">✨ 바로 시작하기</div>' },
    { id: 'sig-clay-card', name: '📦 볼륨 클레이 카드', icon: '📦', w: 36, h: 25, html: '<div class="sig-comp clay-card"><div class="clay-card-icon">💡</div><strong class="clay-card-title">소프트 인사이트</strong><p class="clay-card-desc">푹신한 점토 질감의 듀얼 섀도우가 적용된 부드러운 카드입니다.</p></div>' },
    { id: 'sig-clay-bubble', name: '🏷️ 파스텔 클레이 버블', icon: '🏷️', w: 22, h: 8, html: '<div class="sig-comp clay-bubble">#CATEGORY_01</div>' },
    { id: 'sig-clay-stat', name: '💡 클레이 통계 캡슐', icon: '💡', w: 28, h: 12, html: '<div class="sig-comp clay-stat"><span class="clay-stat-val">+85%</span><span class="clay-stat-lbl">성장률 지표</span></div>' }
  ],
  'pin-and-paper': [
    { id: 'sig-paper-yellow', name: '📝 옐로우 포스트잇', icon: '📝', w: 28, h: 25, html: '<div class="sig-comp sticky-note yellow"><div class="pin-deco">📌</div><div class="sticky-title">아이디어 메모</div><div class="sticky-body">자유로운 아이디어와 핵심 키워드를 기록하는 접착 메모지입니다.</div></div>' },
    { id: 'sig-paper-mint', name: '📝 민트 포스트잇', icon: '📝', w: 28, h: 25, html: '<div class="sig-comp sticky-note mint"><div class="tape-deco"></div><div class="sticky-title">액션 플랜</div><div class="sticky-body">1. 기획안 작성<br>2. 디자인 시안 검토<br>3. 최종 런칭</div></div>' },
    { id: 'sig-paper-tape', name: '🩹 마스킹 테이프 라벨', icon: '🩹', w: 28, h: 6, html: '<div class="sig-comp washi-tape-wrap"><span class="washi-tape"></span><span class="washi-text">CONFIDENTIAL // 2026</span></div>' },
    { id: 'sig-paper-clip', name: '📎 바인더 클립 카드', icon: '📎', w: 36, h: 25, html: '<div class="sig-comp clip-note"><div class="binder-clip"></div><strong class="clip-note-title">검토 보고서</strong><p class="clip-note-desc">바인더 클립으로 고정된 감성적인 메모 패드입니다.</p></div>' }
  ],
  'bauhaus': [
    { id: 'sig-bauhaus-stamp', name: '🔴 기하 블록 스탬프', icon: '🔴', w: 26, h: 9, html: '<div class="sig-comp bauhaus-stamp"><span class="b-circle"></span><span class="b-square"></span><span class="b-tri"></span><span class="b-text">FORM FOLLOWS FUNCTION</span></div>' },
    { id: 'sig-bauhaus-bar', name: '⬛ 구성주의 헤비 바', icon: '⬛', w: 34, h: 6, html: '<div class="sig-comp construct-bar"><span class="c-block"></span><span class="c-title">BAUHAUS 1919 // ARCHIVE</span></div>' },
    { id: 'sig-bauhaus-badge', name: '📐 스위스 그리드 라벨', icon: '📐', w: 22, h: 8, html: '<div class="sig-comp swiss-badge">INDEX № 01</div>' },
    { id: 'sig-bauhaus-card', name: '🏛️ 바우하우스 프레임', icon: '🏛️', w: 38, h: 26, html: '<div class="sig-comp bauhaus-card"><div class="b-bar-top"></div><strong class="b-title">DESIGN RATIONALE</strong><p class="b-desc">기하학적 질서와 삼원색 그리드를 기반으로 한 기능주의 레이아웃입니다.</p></div>' }
  ],
  'cobalt-grid': [
    { id: 'sig-tech-hud', name: '🌐 계측 HUD 태그', icon: '🌐', w: 26, h: 8, html: '<div class="sig-comp telemetry-tag"><span class="tele-dot"></span><span class="tele-text">[SYS_OK: 104.2 / 89.1]</span></div>' },
    { id: 'sig-tech-box', name: '🎯 조준선 타겟 박스', icon: '🎯', w: 38, h: 25, html: '<div class="sig-comp crosshair-box"><span class="ch tl">+</span><span class="ch tr">+</span><span class="ch bl">+</span><span class="ch br">+</span><div class="ch-title">DATA ANALYTICS</div><div class="ch-desc">실시간 텔레메트리 데이터 및 블루프린트 모니터링 영역입니다.</div></div>' },
    { id: 'sig-tech-neon', name: '⚡ 네온 발광 바', icon: '⚡', w: 30, h: 7, html: '<div class="sig-comp neon-glow-bar"><span class="neon-line"></span><span class="neon-text">SYSTEM CORE ONLINE</span></div>' },
    { id: 'sig-tech-stat', name: '📊 사이버 지표 캡슐', icon: '📊', w: 28, h: 12, html: '<div class="sig-comp cobalt-stat"><span class="c-stat-val">99.8%</span><span class="c-stat-lbl">STABILITY RATIO</span></div>' }
  ],
  'biennale-yellow': [
    { id: 'sig-edit-badge', name: '🏷️ 전시 도록 배지', icon: '🏷️', w: 28, h: 8, html: '<div class="sig-comp editorial-badge">EXHIBITION ARCHIVE // NO. 01</div>' },
    { id: 'sig-edit-quote', name: '📜 세리프 인용구 카드', icon: '📜', w: 40, h: 24, html: '<div class="sig-comp serif-quote-box"><span class="quote-mark">“</span><p class="quote-body">디자인은 단순한 장식이 아니라 사유의 시각적 번역이다.</p><span class="quote-author">— BIENNALE CURATOR NOTE</span></div>' },
    { id: 'sig-edit-glow', name: '🟡 래디얼 블룸 카드', icon: '🟡', w: 36, h: 24, html: '<div class="sig-comp bloom-glow-card"><strong class="bloom-title">CURATION ESSAY</strong><p class="bloom-desc">은은한 웜 옐로우 백라이트가 강조된 우아한 에디토리얼 카드입니다.</p></div>' },
    { id: 'sig-edit-strip', name: '🏷️ 카탈로그 인덱스 스트립', icon: '🏷️', w: 30, h: 6, html: '<div class="sig-comp index-strip"><span class="idx-dot">●</span><span class="idx-text">COLLECTION 2026 // VOL. 04</span></div>' }
  ]
};

function getThemeSignatureComponents(designId) {
  if (SPECIFIC_COMPONENTS[designId]) {
    return SPECIFIC_COMPONENTS[designId];
  }
  const archetype = ARCHETYPE_MAP[designId] || 'editorial';
  if (SPECIFIC_COMPONENTS[archetype]) {
    return SPECIFIC_COMPONENTS[archetype];
  }
  return SPECIFIC_COMPONENTS['biennale-yellow'];
}

// Test all 44 designs
let okCount = 0;
for (const key of Object.keys(window.PptDesigns)) {
  const comps = getThemeSignatureComponents(key);
  if (!comps || comps.length < 3) {
    console.error('Failed for design:', key);
  } else {
    okCount++;
  }
}

console.log(`Successfully verified ${okCount} / 44 designs signature components!`);
