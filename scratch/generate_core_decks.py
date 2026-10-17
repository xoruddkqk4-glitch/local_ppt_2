import os

decks_dir = r"designs\decks"
os.makedirs(decks_dir, exist_ok=True)

core_decks = {
    'bauhaus': {
        'title': 'BAUHAUS 1919',
        'sub': '기하학 · 삼원색 · 그리드 · 기능주의 디자인',
        'bg': '#FFFDF8',
        'c1': '#e11d48',
        'c2': '#2563eb',
        'c3': '#f59e0b',
        'font': 'Archivo Black',
        'googleFont': 'https://fonts.googleapis.com/css2?family=Archivo+Black&display=swap',
        'html': """
      <div style="position:absolute; inset:0; background-image:linear-gradient(#1515150e 1px,transparent 1px),linear-gradient(90deg,#1515150e 1px,transparent 1px); background-size:60px 60px;"></div>
      <div style="position:absolute; left:120px; top:100px; display:flex; align-items:center; gap:20px;">
        <span style="background:#151515; color:#fff; font-size:24px; font-weight:900; padding:8px 24px; letter-spacing:0.1em;">WEIMAR · DESSAU</span>
        <span style="font-size:24px; font-weight:800; color:#151515;">FORM FOLLOWS FUNCTION</span>
      </div>
      <div style="position:absolute; left:120px; top:240px; z-index:2;">
        <h1 style="font-size:160px; font-weight:900; line-height:0.9; letter-spacing:-0.05em; color:#151515; margin:0;">BAUHAUS</h1>
        <p style="font-size:42px; font-weight:700; color:#e11d48; margin:30px 0 0 0; letter-spacing:-0.02em;">기하학과 삼원색으로 구축하는 현대 조형의 본질</p>
      </div>
      <div style="position:absolute; right:160px; top:180px; width:400px; height:400px;">
        <div style="position:absolute; right:0; top:0; width:340px; height:340px; border-radius:50%; background:#2563eb;"></div>
        <div style="position:absolute; left:40px; bottom:20px; width:260px; height:260px; background:#e11d48; transform:rotate(12deg);"></div>
        <div style="position:absolute; right:120px; bottom:80px; width:0; height:0; border-left:140px solid transparent; border-right:140px solid transparent; border-bottom:240px solid #f59e0b;"></div>
      </div>
      <div style="position:absolute; left:120px; right:120px; bottom:90px; display:flex; justify-content:space-between; align-items:flex-end; border-top:4px solid #151515; padding-top:24px;">
        <div style="display:flex; gap:16px;">
          <span style="font-size:22px; font-weight:800; background:#e11d48; color:#fff; padding:6px 18px;">#E11D48</span>
          <span style="font-size:22px; font-weight:800; background:#2563eb; color:#fff; padding:6px 18px;">#2563EB</span>
          <span style="font-size:22px; font-weight:800; background:#f59e0b; color:#151515; padding:6px 18px;">#F59E0B</span>
        </div>
        <span style="font-size:26px; font-weight:900; letter-spacing:0.05em; color:#151515;">LOCAL PPT · CORE DESIGN 01</span>
      </div>
        """
    },
    'clay': {
        'title': 'CLAYMORPHISM',
        'sub': '점토감 · Soft 3D · 듀얼 그림자 · 파스텔톤 입체 디자인',
        'bg': '#F7EEE9',
        'c1': '#ec4899',
        'c2': '#8b5cf6',
        'c3': '#10b981',
        'font': 'Fredoka',
        'googleFont': 'https://fonts.googleapis.com/css2?family=Fredoka:wght@600;700&display=swap',
        'html': """
      <div style="position:absolute; left:120px; top:120px; display:flex; gap:16px;">
        <span style="padding:12px 30px; border-radius:30px; background:#F7EEE9; box-shadow:8px 8px 16px #c4b6b5, -8px -8px 16px #ffffff; font-size:24px; font-weight:800; color:#ec4899;">SOFT 3D TACTILE</span>
        <span style="padding:12px 30px; border-radius:30px; background:#F7EEE9; box-shadow:8px 8px 16px #c4b6b5, -8px -8px 16px #ffffff; font-size:24px; font-weight:800; color:#8b5cf6;">CLAY UI STYLE</span>
      </div>
      <div style="position:absolute; left:120px; top:280px; z-index:2;">
        <h1 style="font-size:140px; font-weight:900; line-height:0.95; letter-spacing:-0.04em; color:#ec4899; margin:0; text-shadow:4px 4px 12px rgba(236,72,153,0.25);">CLAYMORPHISM</h1>
        <p style="font-size:38px; font-weight:700; color:#64748b; margin:35px 0 0 0;">말랑한 점토 느낌의 둥근 볼륨감과 부드러운 깊이감</p>
      </div>
      <div style="position:absolute; right:150px; top:200px; display:flex; gap:30px;">
        <div style="width:220px; height:320px; border-radius:45px; background:#F7EEE9; box-shadow:20px 20px 40px #c4b6b5, -16px -16px 36px #ffffff; display:flex; flex-direction:column; justify-content:center; align-items:center; gap:20px;">
          <div style="width:90px; height:90px; border-radius:50%; background:#ec4899; box-shadow:inset 6px 6px 12px rgba(255,255,255,0.4), inset -6px -6px 12px rgba(0,0,0,0.2);"></div>
          <span style="font-size:22px; font-weight:800; color:#ec4899;">SOFT PILL</span>
        </div>
        <div style="width:220px; height:320px; border-radius:45px; background:#8b5cf6; box-shadow:20px 20px 40px rgba(139,92,246,0.35), -12px -12px 28px #ffffff; display:flex; flex-direction:column; justify-content:center; align-items:center; gap:20px; transform:translateY(60px);">
          <div style="width:90px; height:90px; border-radius:50%; background:#ffffff; box-shadow:inset 6px 6px 12px rgba(0,0,0,0.1);"></div>
          <span style="font-size:22px; font-weight:800; color:#ffffff;">3D VOLUME</span>
        </div>
      </div>
      <div style="position:absolute; left:120px; right:120px; bottom:90px; display:flex; justify-content:space-between; align-items:center;">
        <div style="display:flex; gap:20px;">
          <span style="padding:10px 24px; border-radius:20px; background:#F7EEE9; box-shadow:6px 6px 12px #c4b6b5, -6px -6px 12px #ffffff; font-size:20px; font-weight:800; color:#ec4899;">#EC4899</span>
          <span style="padding:10px 24px; border-radius:20px; background:#F7EEE9; box-shadow:6px 6px 12px #c4b6b5, -6px -6px 12px #ffffff; font-size:20px; font-weight:800; color:#8b5cf6;">#8B5CF6</span>
          <span style="padding:10px 24px; border-radius:20px; background:#F7EEE9; box-shadow:6px 6px 12px #c4b6b5, -6px -6px 12px #ffffff; font-size:20px; font-weight:800; color:#10b981;">#10B981</span>
        </div>
        <span style="font-size:24px; font-weight:800; color:#64748b;">LOCAL PPT · CORE DESIGN 02</span>
      </div>
        """
    },
    'brutal': {
        'title': 'NEO-BRUTALISM',
        'sub': 'Thick Border · Hard Shadow · High Contrast · Bold Type',
        'bg': '#FFFFFF',
        'c1': '#ff2a2a',
        'c2': '#2a55ff',
        'c3': '#ffcc00',
        'font': 'Space Grotesk',
        'googleFont': 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@700;900&display=swap',
        'html': """
      <div style="position:absolute; inset:30px; border:6px solid #000; box-shadow:14px 14px 0 #000; pointer-events:none;"></div>
      <div style="position:absolute; left:100px; top:90px; display:flex; gap:16px;">
        <span style="border:4px solid #000; background:#ffcc00; padding:10px 24px; font-size:24px; font-weight:900; box-shadow:6px 6px 0 #000;">RAW &amp; UNFILTERED</span>
        <span style="border:4px solid #000; background:#fff; padding:10px 24px; font-size:24px; font-weight:900; box-shadow:6px 6px 0 #000;">BOLD VISUALS</span>
      </div>
      <div style="position:absolute; left:100px; top:240px; z-index:2;">
        <h1 style="font-size:148px; font-weight:900; line-height:0.92; letter-spacing:-0.05em; color:#000; margin:0;">NEO<br>BRUTALISM</h1>
        <div style="margin-top:35px; display:inline-block; border:4px solid #000; background:#ff2a2a; color:#fff; padding:12px 28px; font-size:34px; font-weight:900; box-shadow:8px 8px 0 #000;">
          타협 없는 고대비와 단단한 외곽선의 조화
        </div>
      </div>
      <div style="position:absolute; right:120px; top:180px; width:420px; display:flex; flex-direction:column; gap:26px;">
        <div style="border:5px solid #000; background:#2a55ff; color:#fff; padding:28px; box-shadow:10px 10px 0 #000;">
          <span style="font-size:48px; font-weight:900;">01. CONTRAST</span>
          <p style="font-size:22px; font-weight:700; margin:10px 0 0 0;">블러 없는 솔리드 블랙 하드 섀도우</p>
        </div>
        <div style="border:5px solid #000; background:#ffcc00; color:#000; padding:28px; box-shadow:10px 10px 0 #000; transform:rotate(-3deg);">
          <span style="font-size:48px; font-weight:900;">02. IMPACT</span>
          <p style="font-size:22px; font-weight:800; margin:10px 0 0 0;">시선을 사로잡는 강력한 원색 스티커</p>
        </div>
      </div>
      <div style="position:absolute; left:100px; right:100px; bottom:70px; display:flex; justify-content:space-between; align-items:center;">
        <span style="font-size:24px; font-weight:900; letter-spacing:0.04em;">THICK BORDERS · PURE WHITE BACKGROUND</span>
        <span style="font-size:24px; font-weight:900;">LOCAL PPT · CORE DESIGN 03</span>
      </div>
        """
    },
    'skeuo': {
        'title': 'SKEUOMORPHISM',
        'sub': '양피지 질감 · 골드 엠보싱 · 사실적인 입체 디테일',
        'bg': '#EAD2AA',
        'c1': '#d97706',
        'c2': '#059669',
        'c3': '#4f46e5',
        'font': 'Cinzel',
        'googleFont': 'https://fonts.googleapis.com/css2?family=Cinzel:wght@700;900&display=swap',
        'html': """
      <div style="position:absolute; inset:0; background:radial-gradient(ellipse at center, rgba(255,255,255,0.3) 0%, rgba(120,70,30,0.18) 100%);"></div>
      <div style="position:absolute; inset:36px; border:4px solid #5d351b; box-shadow:inset 0 0 24px rgba(93,53,27,0.4), 0 0 16px rgba(0,0,0,0.15); pointer-events:none;"></div>
      <div style="position:absolute; left:120px; top:120px; display:flex; align-items:center; gap:20px;">
        <span style="border:2px solid #5d351b; background:linear-gradient(180deg,#fff5e3,#e8cb9e); padding:8px 24px; font-size:22px; font-weight:900; color:#5d351b; box-shadow:0 3px 6px rgba(81,45,27,0.3); border-radius:6px;">TACTILE CLASSIC</span>
        <span style="font-size:24px; font-weight:700; color:#5d351b;">ANALOG DIGITAL HARMONY</span>
      </div>
      <div style="position:absolute; left:120px; top:280px; z-index:2;">
        <h1 style="font-size:120px; font-weight:900; letter-spacing:0.04em; color:#4a270f; margin:0; text-shadow:2px 2px 0 rgba(255,255,255,0.7), 4px 4px 8px rgba(0,0,0,0.3);">SKEUOMORPHISM</h1>
        <p style="font-size:38px; font-weight:700; color:#6b3e25; margin:30px 0 0 0;">손에 닿을 듯한 질감과 따뜻한 아날로그 매력의 재해석</p>
      </div>
      <div style="position:absolute; right:160px; top:220px; width:360px; border:3px solid #7c4c2a; background:linear-gradient(180deg,#fffdf7,#ebd7b7); box-shadow:0 12px 28px rgba(81,45,27,0.35); border-radius:12px; padding:36px;">
        <span style="font-size:32px; font-weight:900; color:#5d351b;">GOLD ACCENT</span>
        <div style="width:100%; height:4px; background:#d97706; margin:16px 0;"></div>
        <p style="font-size:22px; font-weight:700; color:#784522; line-height:1.5;">디지털 캔버스 위에 구현된 클래식 가죽과 양피지의 깊은 울림</p>
      </div>
      <div style="position:absolute; left:120px; right:120px; bottom:90px; display:flex; justify-content:space-between; align-items:center; border-top:2px solid #5d351b66; padding-top:20px;">
        <span style="font-size:24px; font-weight:800; color:#5d351b;">#D97706 · #059669 · #4F46E5</span>
        <span style="font-size:24px; font-weight:900; color:#5d351b;">LOCAL PPT · CORE DESIGN 04</span>
      </div>
        """
    },
    'swiss': {
        'title': 'SWISS MINIMAL',
        'sub': '정밀한 그리드 · 넉넉한 여백 · 절제된 색상 · 명확한 타이포그래피',
        'bg': '#FFFFFF',
        'c1': '#2563eb',
        'c2': '#d97706',
        'c3': '#059669',
        'font': 'Inter',
        'googleFont': 'https://fonts.googleapis.com/css2?family=Inter:wght@400;700;800;900&display=swap',
        'html': """
      <div style="position:absolute; inset:0; background-image:linear-gradient(#1111110a 1px,transparent 1px),linear-gradient(90deg,#1111110a 1px,transparent 1px); background-size:80px 80px;"></div>
      <div style="position:absolute; left:120px; top:120px; display:flex; align-items:center; gap:24px;">
        <div style="width:24px; height:24px; background:#2563eb;"></div>
        <span style="font-size:22px; font-weight:800; letter-spacing:0.12em; color:#111;">ZURICH · BASEL SCHOOL</span>
      </div>
      <div style="position:absolute; left:120px; top:260px; z-index:2;">
        <h1 style="font-size:144px; font-weight:900; line-height:0.92; letter-spacing:-0.05em; color:#111; margin:0;">SWISS<br>MINIMAL</h1>
        <p style="font-size:38px; font-weight:700; color:#475569; margin:35px 0 0 0; letter-spacing:-0.03em;">완벽한 기하학적 비례와 넉넉한 여백이 만드는 정제된 명료함</p>
      </div>
      <div style="position:absolute; right:160px; top:240px; width:340px; border:2px solid #111; padding:32px; background:#fff;">
        <span style="font-size:18px; font-weight:800; color:#2563eb; letter-spacing:0.08em;">GRID SPECIFICATION</span>
        <div style="font-size:48px; font-weight:900; margin:14px 0; color:#111;">12 COL</div>
        <p style="font-size:20px; color:#64748b; margin:0; line-height:1.5;">정보의 질서와 가독성을 최우선으로 고려한 기능적 타이포그래피</p>
      </div>
      <div style="position:absolute; left:120px; right:120px; bottom:90px; display:flex; justify-content:space-between; align-items:center; border-top:2px solid #111; padding-top:24px;">
        <span style="font-size:22px; font-weight:700; color:#64748b;">HELVETICA &amp; INTER TYPOGRAPHY</span>
        <span style="font-size:24px; font-weight:900; color:#111;">LOCAL PPT · CORE DESIGN 05</span>
      </div>
        """
    },
    'swiss-grid': {
        'title': 'SWISS GRID MODERN',
        'sub': '12열 그리드 · 고대비 흑백 · 단일 블루 강조색 · 데이터 중심',
        'bg': '#FFFFFF',
        'c1': '#1e40af',
        'c2': '#0f766e',
        'c3': '#b45309',
        'font': 'Inter',
        'googleFont': 'https://fonts.googleapis.com/css2?family=Inter:wght@400;700;800;900&display=swap',
        'html': """
      <div style="position:absolute; inset:0; background-image:linear-gradient(#1113180e 1px,transparent 1px),linear-gradient(90deg,#1113180e 1px,transparent 1px); background-size:60px 60px;"></div>
      <div style="position:absolute; left:120px; top:120px; display:flex; gap:16px;">
        <span style="background:#1e40af; color:#fff; padding:6px 18px; font-size:20px; font-weight:800;">MODERN DATA</span>
        <span style="border:1px solid #111; padding:6px 18px; font-size:20px; font-weight:800;">12-COL BLUEPRINT</span>
      </div>
      <div style="position:absolute; left:120px; top:280px;">
        <h1 style="font-size:130px; font-weight:900; line-height:0.95; letter-spacing:-0.05em; color:#111318; margin:0;">SWISS GRID<br>SYSTEM</h1>
        <p style="font-size:36px; font-weight:700; color:#1e40af; margin:30px 0 0 0;">정교한 12열 시스템과 단일 블루 포인트의 신뢰감</p>
      </div>
      <div style="position:absolute; right:140px; top:240px; width:380px; border:2px solid #111318; background:#fff; padding:32px;">
        <div style="display:grid; grid-template-columns:repeat(4,1fr); gap:8px; margin-bottom:20px;">
          <div style="height:24px; background:#1e40af;"></div><div style="height:24px; background:#1e40af; opacity:0.6;"></div><div style="height:24px; background:#1e40af; opacity:0.3;"></div><div style="height:24px; border:1px solid #111;"></div>
        </div>
        <span style="font-size:28px; font-weight:900; color:#111318;">SYSTEM ARCHITECTURE</span>
        <p style="font-size:20px; color:#64748b; margin:12px 0 0 0;">데이터와 텍스트를 명확하게 정렬하는 정밀 모듈</p>
      </div>
      <div style="position:absolute; left:120px; right:120px; bottom:90px; display:flex; justify-content:space-between; align-items:center; border-top:2px solid #111318; padding-top:20px;">
        <span style="font-size:22px; font-weight:700; color:#64748b;">#1E40AF · #0F766E · #B45309</span>
        <span style="font-size:24px; font-weight:900; color:#111318;">LOCAL PPT · CORE DESIGN 06</span>
      </div>
        """
    },
    'functional-bauhaus': {
        'title': 'FUNCTIONAL BAUHAUS',
        'sub': '기능적인 비대칭 구성 · 절제된 삼원색 · 굵은 타이포그래피',
        'bg': '#F7F2E8',
        'c1': '#dc2626',
        'c2': '#1d4ed8',
        'c3': '#d97706',
        'font': 'Barlow',
        'googleFont': 'https://fonts.googleapis.com/css2?family=Barlow:wght@700;900&display=swap',
        'html': """
      <div style="position:absolute; top:0; left:0; width:100%; height:30px; background:#dc2626;"></div>
      <div style="position:absolute; left:120px; top:120px; display:flex; gap:16px;">
        <span style="background:#111; color:#fff; font-size:22px; font-weight:900; padding:6px 20px;">FUNCTIONAL</span>
        <span style="background:#1d4ed8; color:#fff; font-size:22px; font-weight:900; padding:6px 20px;">CONSTRUCTIVISM</span>
      </div>
      <div style="position:absolute; left:120px; top:280px;">
        <h1 style="font-size:140px; font-weight:900; line-height:0.92; letter-spacing:-0.05em; color:#111; margin:0;">FUNCTIONAL<br>BAUHAUS</h1>
        <p style="font-size:38px; font-weight:800; color:#dc2626; margin:30px 0 0 0;">군더더기를 배제한 비대칭 타이포그래피와 산업적 감성</p>
      </div>
      <div style="position:absolute; right:150px; top:220px; width:380px; border:4px solid #111; background:#fff; padding:32px;">
        <div style="width:60px; height:60px; background:#d97706; border:3px solid #111; margin-bottom:20px;"></div>
        <span style="font-size:36px; font-weight:900; color:#111;">ASYMMETRY</span>
        <p style="font-size:22px; color:#475569; margin:12px 0 0 0; line-height:1.4;">기능이 형태를 정의하는 가장 직접적인 커뮤니케이션</p>
      </div>
      <div style="position:absolute; left:120px; right:120px; bottom:90px; display:flex; justify-content:space-between; align-items:center; border-top:3px solid #111; padding-top:20px;">
        <span style="font-size:24px; font-weight:900; color:#111;">PRIMARY ACCENTS &amp; HEAVY HEADLINES</span>
        <span style="font-size:24px; font-weight:900; color:#111;">LOCAL PPT · CORE DESIGN 07</span>
      </div>
        """
    },
    'soft-minimal': {
        'title': 'SOFT LAYERED MINIMAL',
        'sub': '밝은 중성 배경 · 낮은 채도 · 둥근 카드 · 부드러운 깊이감',
        'bg': '#F7F8FC',
        'c1': '#6366f1',
        'c2': '#14b8a6',
        'c3': '#f59e0b',
        'font': 'Plus Jakarta Sans',
        'googleFont': 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@600;700;800&display=swap',
        'html': """
      <div style="position:absolute; right:200px; top:120px; width:500px; height:500px; border-radius:50%; background:radial-gradient(circle, rgba(99,102,241,0.18) 0%, rgba(247,248,252,0) 70%); pointer-events:none;"></div>
      <div style="position:absolute; left:120px; top:120px; display:flex; gap:16px;">
        <span style="background:#fff; border:1px solid #e2e8f0; box-shadow:0 4px 12px rgba(0,0,0,0.05); border-radius:24px; padding:10px 26px; font-size:22px; font-weight:700; color:#6366f1;">ELEGANT SOFTNESS</span>
        <span style="background:#fff; border:1px solid #e2e8f0; box-shadow:0 4px 12px rgba(0,0,0,0.05); border-radius:24px; padding:10px 26px; font-size:22px; font-weight:700; color:#14b8a6;">MODERN SAAS</span>
      </div>
      <div style="position:absolute; left:120px; top:280px; z-index:2;">
        <h1 style="font-size:132px; font-weight:900; line-height:0.95; letter-spacing:-0.04em; color:#0f172a; margin:0;">SOFT LAYERED<br>MINIMAL</h1>
        <p style="font-size:38px; font-weight:600; color:#64748b; margin:35px 0 0 0;">눈이 편안한 뉴트럴 톤과 섬세한 레이어로 전하는 세련미</p>
      </div>
      <div style="position:absolute; right:150px; top:240px; width:380px; background:#fff; border-radius:28px; padding:36px; box-shadow:0 20px 40px rgba(99,102,241,0.12); border:1px solid #e2e8f0;">
        <div style="width:48px; height:48px; border-radius:14px; background:#6366f1; margin-bottom:20px;"></div>
        <span style="font-size:32px; font-weight:800; color:#0f172a;">SUBTLE DEPTH</span>
        <p style="font-size:22px; color:#64748b; margin:12px 0 0 0; line-height:1.5;">과하지 않은 그림자와 부드러운 라운딩으로 완성한 가독성</p>
      </div>
      <div style="position:absolute; left:120px; right:120px; bottom:90px; display:flex; justify-content:space-between; align-items:center; border-top:1px solid #e2e8f0; padding-top:20px;">
        <span style="font-size:22px; font-weight:600; color:#94a3b8;">#6366F1 · #14B8A6 · #F59E0B</span>
        <span style="font-size:24px; font-weight:800; color:#0f172a;">LOCAL PPT · CORE DESIGN 08</span>
      </div>
        """
    },
    'controlled-brutal': {
        'title': 'CONTROLLED NEO-BRUTALISM',
        'sub': '정돈된 굵은 테두리 · 제한된 원색 · 작은 오프셋 그림자',
        'bg': '#FFFDF5',
        'c1': '#ef4444',
        'c2': '#3b82f6',
        'c3': '#eab308',
        'font': 'Space Grotesk',
        'googleFont': 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@700;900&display=swap',
        'html': """
      <div style="position:absolute; left:120px; top:120px; display:flex; gap:16px;">
        <span style="border:3px solid #171717; background:#eab308; padding:8px 22px; font-size:22px; font-weight:900; box-shadow:4px 4px 0 #171717;">BALANCED BRUTALISM</span>
        <span style="border:3px solid #171717; background:#fff; padding:8px 22px; font-size:22px; font-weight:900; box-shadow:4px 4px 0 #171717;">STRUCTURED</span>
      </div>
      <div style="position:absolute; left:120px; top:280px; z-index:2;">
        <h1 style="font-size:126px; font-weight:900; line-height:0.95; letter-spacing:-0.04em; color:#171717; margin:0;">CONTROLLED<br>BRUTALISM</h1>
        <p style="font-size:38px; font-weight:800; color:#ef4444; margin:30px 0 0 0;">과장됨을 덜어내고 실무 프레젠테이션에 최적화한 네오 브루탈</p>
      </div>
      <div style="position:absolute; right:150px; top:240px; width:380px; border:3px solid #171717; background:#fff; padding:32px; box-shadow:6px 6px 0 #171717;">
        <span style="font-size:32px; font-weight:900; color:#171717;">REFINED ACCENTS</span>
        <p style="font-size:22px; color:#404040; margin:14px 0 0 0; line-height:1.5;">단정한 3px 외곽선과 경쾌한 포인트 컬러의 세련된 조화</p>
      </div>
      <div style="position:absolute; left:120px; right:120px; bottom:90px; display:flex; justify-content:space-between; align-items:center; border-top:3px solid #171717; padding-top:20px;">
        <span style="font-size:22px; font-weight:800; color:#525252;">#EF4444 · #3B82F6 · #EAB308</span>
        <span style="font-size:24px; font-weight:900; color:#171717;">LOCAL PPT · CORE DESIGN 09</span>
      </div>
        """
    },
    'tactile-minimal': {
        'title': 'TACTILE PRODUCT MINIMAL',
        'sub': '제품 UI 감각 · 금속성 중성색 · 섬세한 입체 컨트롤',
        'bg': '#F6F7F4',
        'c1': '#475569',
        'c2': '#0284c7',
        'c3': '#d97706',
        'font': 'Outfit',
        'googleFont': 'https://fonts.googleapis.com/css2?family=Outfit:wght@500;700;900&display=swap',
        'html': """
      <div style="position:absolute; left:120px; top:120px; display:flex; gap:16px;">
        <span style="border:1px solid #747974; background:#fff; padding:8px 24px; border-radius:6px; font-size:22px; font-weight:800; color:#334155; box-shadow:0 2px 4px rgba(0,0,0,0.06);">PRODUCT HARDWARE UI</span>
        <span style="border:1px solid #747974; background:#fff; padding:8px 24px; border-radius:6px; font-size:22px; font-weight:800; color:#0284c7; box-shadow:0 2px 4px rgba(0,0,0,0.06);">TACTILE CONTROLS</span>
      </div>
      <div style="position:absolute; left:120px; top:280px; z-index:2;">
        <h1 style="font-size:128px; font-weight:900; line-height:0.95; letter-spacing:-0.04em; color:#1e293b; margin:0;">TACTILE PRODUCT<br>MINIMAL</h1>
        <p style="font-size:38px; font-weight:700; color:#0284c7; margin:30px 0 0 0;">정밀 기기 인터페이스의 금속성 텍스처와 정교한 마감</p>
      </div>
      <div style="position:absolute; right:150px; top:240px; width:380px; border:1px solid #747974; background:linear-gradient(180deg,#ffffff,#f1f3ee); border-radius:10px; padding:32px; box-shadow:0 8px 18px rgba(0,0,0,0.08);">
        <span style="font-size:30px; font-weight:900; color:#1e293b;">MATTE FINISH</span>
        <p style="font-size:22px; color:#475569; margin:14px 0 0 0; line-height:1.5;">정밀 가공된 알루미늄과 다이얼 버튼을 연상시키는 섬세한 디테일</p>
      </div>
      <div style="position:absolute; left:120px; right:120px; bottom:90px; display:flex; justify-content:space-between; align-items:center; border-top:1px solid #cbd5e1; padding-top:20px;">
        <span style="font-size:22px; font-weight:700; color:#64748b;">#475569 · #0284C7 · #D97706</span>
        <span style="font-size:24px; font-weight:900; color:#1e293b;">LOCAL PPT · CORE DESIGN 10</span>
      </div>
        """
    }
}

count = 0
for key, d in core_decks.items():
    page = f"""<!DOCTYPE html>
<html lang="ko" data-template="{key}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{d['title']}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="{d['googleFont']}">
<style>
/* === KOREAN FONTS === */
@font-face{{font-family:'Pretendard';font-display:swap;src:url("fonts/Pretendard-Regular.ttf"),url("https://maker-ssam.github.io/korean-ofl-fonts/fonts/pretendard/Pretendard-Regular.woff2") format("woff2");font-weight:400}}
@font-face{{font-family:'Pretendard';font-display:swap;src:url("fonts/Pretendard-Bold.ttf"),url("https://maker-ssam.github.io/korean-ofl-fonts/fonts/pretendard/Pretendard-Bold.woff2") format("woff2");font-weight:700}}
:root {{
  --stage-bg: {d['bg']};
  --slide-bg: {d['bg']};
  --font-title: '{d['font']}', 'Pretendard', sans-serif;
  --font-body: 'Pretendard', sans-serif;
}}
* {{ margin:0; padding:0; box-sizing:border-box; }}
html, body {{ width:100%; height:100%; margin:0; overflow:hidden; background:var(--stage-bg, #000); font-family:var(--font-body); }}
.deck-viewport {{ position:fixed; inset:0; overflow:hidden; background:var(--stage-bg, #000); }}
.deck-stage {{ position:absolute; left:0; top:0; width:1920px; height:1080px; overflow:hidden; transform-origin:0 0; background:var(--slide-bg, #fff); }}
.slide {{ position:absolute; inset:0; width:1920px; height:1080px; overflow:hidden; display:block; visibility:visible; opacity:1; background:var(--slide-bg, #fff); }}
html.in-frame .dk-nav, html.in-frame .dk-controls, html.in-frame .hint {{ display:none !important; }}
</style>
</head>
<body>
<div class="deck-viewport">
  <div class="deck-stage" id="deckStage">
    <section class="slide s1 active visible" style="font-family:var(--font-title);">
      {d['html']}
    </section>
  </div>
</div>
<script>
(function() {{
  var stage = document.getElementById('deckStage');
  if (window.top !== window) document.documentElement.classList.add('in-frame');
  function fit() {{
    var f = Math.min(innerWidth / 1920, innerHeight / 1080);
    stage.style.transform = 'translate(' + (innerWidth - 1920 * f) / 2 + 'px,' + (innerHeight - 1080 * f) / 2 + 'px) scale(' + f + ')';
  }}
  fit();
  addEventListener('resize', fit);
}})();
</script>
</body>
</html>"""
    target = os.path.join(decks_dir, f"{key}.html")
    with open(target, 'w', encoding='utf-8') as f:
        f.write(page)
    count += 1

print(f"Created {count} core deck HTML files in {decks_dir}")
