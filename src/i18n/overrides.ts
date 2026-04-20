/**
 * i18n 수동 번역 사전 — Google Translate 문맥 오역 교정
 *
 * 제품 카테고리/기술 용어는 Google Translate가 의미 없이 직역하여
 * 예) "server" → "섬기는 사람", "wall mount pc" → "벽걸이 PC" 같은
 * 어색한 결과가 나오기 때문에, 이 사전에 명시된 용어는 Google 호출을
 * 건너뛰고 사전 값으로 직접 교체한다.
 *
 * 키: 원본 텍스트 (lowercase + trim)
 * 값: { 대상언어코드: 번역문 }
 * 지원 언어: ko, en, ja, zh-TW, ar, fr, de, es
 */

type Lang = 'ko' | 'en' | 'ja' | 'zh-TW' | 'ar' | 'fr' | 'de' | 'es';

const MANUAL_OVERRIDES: Record<string, Partial<Record<Lang, string>>> = {
  // ── 산업용 PC ──
  'server': { ko: '서버', en: 'Server', ja: 'サーバー', 'zh-TW': '伺服器', ar: 'خادم', fr: 'Serveur', de: 'Server', es: 'Servidor' },
  'servers': { ko: '서버', en: 'Servers', ja: 'サーバー', 'zh-TW': '伺服器', ar: 'خوادم', fr: 'Serveurs', de: 'Server', es: 'Servidores' },
  'boxed pc': { ko: '박스형 PC', en: 'Box PC', ja: 'ボックス型PC', 'zh-TW': '盒式PC', ar: 'حاسوب مدمج (بوكس)', fr: 'PC compact (Box)', de: 'Box-PC', es: 'PC tipo caja' },
  'boxtype pc': { ko: '박스형 PC', en: 'Box PC', ja: 'ボックス型PC', 'zh-TW': '盒式PC', ar: 'حاسوب مدمج (بوكس)', fr: 'PC compact (Box)', de: 'Box-PC', es: 'PC tipo caja' },
  'rackmount pc': { ko: '랙마운트 PC', en: 'Rackmount PC', ja: 'ラックマウントPC', 'zh-TW': '機架式PC', ar: 'حاسوب للتركيب على الرف', fr: 'PC rackable', de: 'Rack-PC', es: 'PC de bastidor' },
  'desktop pc': { ko: '데스크탑 PC', en: 'Desktop PC', ja: 'デスクトップPC', 'zh-TW': '桌上型PC', ar: 'حاسوب مكتبي', fr: 'PC de bureau', de: 'Desktop-PC', es: 'PC de escritorio' },
  'wall mount pc': { ko: '월마운트 PC', en: 'Wallmount PC', ja: 'ウォールマウントPC', 'zh-TW': '壁掛式PC', ar: 'حاسوب للتركيب الجداري', fr: 'PC mural', de: 'Wandmontage-PC', es: 'PC de montaje en pared' },
  'wallmount pc': { ko: '월마운트 PC', en: 'Wallmount PC', ja: 'ウォールマウントPC', 'zh-TW': '壁掛式PC', ar: 'حاسوب للتركيب الجداري', fr: 'PC mural', de: 'Wandmontage-PC', es: 'PC de montaje en pared' },
  'panel pc': { ko: '패널 PC', en: 'Panel PC', ja: 'パネルPC', 'zh-TW': '面板式PC', ar: 'حاسوب لوحي صناعي', fr: 'PC panneau', de: 'Panel-PC', es: 'PC de panel' },
  'industrial pcs & fanless systems': { ko: '산업용 PC & 팬리스 시스템', en: 'Industrial PCs & Fanless Systems', ja: '産業用PC＆ファンレスシステム', 'zh-TW': '工業電腦與無風扇系統', ar: 'أجهزة الكمبيوتر الصناعية والأنظمة بدون مروحة', fr: 'PC industriels et systèmes sans ventilateur', de: 'Industrie-PCs & lüfterlose Systeme', es: 'PC industriales y sistemas sin ventilador' },

  // ── 폼 팩터 / HIMA / 항공우주 / 철도 ──
  'form factor (abaco systems)': { ko: '폼 팩터 (Abaco Systems)', en: 'Form Factor (Abaco Systems)', ja: 'フォームファクタ (Abaco Systems)', 'zh-TW': '規格尺寸 (Abaco Systems)', ar: 'عامل الشكل (Abaco Systems)', fr: 'Facteur de forme (Abaco Systems)', de: 'Formfaktor (Abaco Systems)', es: 'Factor de forma (Abaco Systems)' },
  'form factor abaco systems': { ko: '폼 팩터 Abaco Systems', en: 'Form Factor Abaco Systems', ja: 'フォームファクタ Abaco Systems', 'zh-TW': '規格尺寸 Abaco Systems', ar: 'عامل الشكل Abaco Systems', fr: 'Facteur de forme Abaco Systems', de: 'Formfaktor Abaco Systems', es: 'Factor de forma Abaco Systems' },
  'hima rail system': { ko: 'HIMA 철도 시스템', en: 'HIMA Rail System', ja: 'HIMA 鉄道システム', 'zh-TW': 'HIMA 鐵道系統', ar: 'نظام HIMA للسكك الحديدية', fr: 'Système ferroviaire HIMA', de: 'HIMA-Bahnsystem', es: 'Sistema ferroviario HIMA' },
  'hima railway safety system': { ko: 'HIMA 철도 안전 시스템', en: 'HIMA Railway Safety System', ja: 'HIMA 鉄道安全システム', 'zh-TW': 'HIMA 鐵道安全系統', ar: 'نظام السلامة للسكك الحديدية HIMA', fr: 'Système de sécurité ferroviaire HIMA', de: 'HIMA-Bahnsicherheitssystem', es: 'Sistema de seguridad ferroviaria HIMA' },
  'military & aerospace': { ko: '국방 & 항공우주', en: 'Military & Aerospace', ja: '軍事＆航空宇宙', 'zh-TW': '軍事與航太', ar: 'الدفاع والفضاء', fr: 'Militaire et aérospatial', de: 'Militär & Luft-/Raumfahrt', es: 'Defensa y aeroespacial' },
  'rail transportation': { ko: '철도 운송', en: 'Rail Transportation', ja: '鉄道輸送', 'zh-TW': '軌道運輸', ar: 'النقل بالسكك الحديدية', fr: 'Transport ferroviaire', de: 'Schienenverkehr', es: 'Transporte ferroviario' },
  'industrial automation': { ko: '산업 자동화', en: 'Industrial Automation', ja: '産業オートメーション', 'zh-TW': '工業自動化', ar: 'الأتمتة الصناعية', fr: 'Automatisation industrielle', de: 'Industrieautomatisierung', es: 'Automatización industrial' },

  // ── 컴퓨팅 / OS / 미들웨어 ──
  'high performance computing': { ko: '고성능 컴퓨팅', en: 'High Performance Computing', ja: 'ハイパフォーマンスコンピューティング', 'zh-TW': '高效能運算', ar: 'الحوسبة عالية الأداء', fr: 'Calcul haute performance', de: 'Hochleistungsrechnen', es: 'Computación de alto rendimiento' },
  'real-time operating system': { ko: '실시간 운영체제 (RTOS)', en: 'Real-Time Operating System', ja: 'リアルタイムオペレーティングシステム', 'zh-TW': '即時作業系統', ar: 'نظام تشغيل فوري (RTOS)', fr: "Système d'exploitation temps réel", de: 'Echtzeit-Betriebssystem', es: 'Sistema operativo en tiempo real' },
  'middleware software': { ko: '미들웨어 소프트웨어', en: 'Middleware Software', ja: 'ミドルウェアソフトウェア', 'zh-TW': '中介軟體', ar: 'برامج وسيطة (Middleware)', fr: 'Logiciel intergiciel (Middleware)', de: 'Middleware-Software', es: 'Software middleware' },
  'device cloud (iot)': { ko: '디바이스 클라우드 (IoT)', en: 'Device Cloud (IoT)', ja: 'デバイスクラウド (IoT)', 'zh-TW': '裝置雲 (IoT)', ar: 'سحابة الأجهزة (IoT)', fr: "Cloud d'appareils (IoT)", de: 'Geräte-Cloud (IoT)', es: 'Nube de dispositivos (IoT)' },

  // ── 센서 시뮬레이션 ──
  'sensor modeling & simulation': { ko: '센서 모델링 & 시뮬레이션', en: 'Sensor Modeling & Simulation', ja: 'センサモデリング＆シミュレーション', 'zh-TW': '感測器建模與模擬', ar: 'نمذجة ومحاكاة المستشعرات', fr: 'Modélisation et simulation de capteurs', de: 'Sensormodellierung & -simulation', es: 'Modelado y simulación de sensores' },
  'eo/ir sensor simulation': { ko: 'EO/IR 센서 시뮬레이션', en: 'EO/IR Sensor Simulation', ja: 'EO/IRセンサシミュレーション', 'zh-TW': 'EO/IR 感測器模擬', ar: 'محاكاة مستشعر EO/IR', fr: 'Simulation de capteur EO/IR', de: 'EO/IR-Sensorsimulation', es: 'Simulación de sensor EO/IR' },
  'rf sensor simulation': { ko: 'RF 센서 시뮬레이션', en: 'RF Sensor Simulation', ja: 'RFセンサシミュレーション', 'zh-TW': 'RF 感測器模擬', ar: 'محاكاة مستشعر RF', fr: 'Simulation de capteur RF', de: 'RF-Sensorsimulation', es: 'Simulación de sensor RF' },
  'active eo sensor simulation': { ko: '능동형 EO 센서 시뮬레이션', en: 'Active EO Sensor Simulation', ja: 'アクティブEOセンサシミュレーション', 'zh-TW': '主動式 EO 感測器模擬', ar: 'محاكاة مستشعر EO النشط', fr: 'Simulation de capteur EO actif', de: 'Aktive EO-Sensorsimulation', es: 'Simulación de sensor EO activo' },
  'gnss sensor simulation': { ko: 'GNSS 센서 시뮬레이션', en: 'GNSS Sensor Simulation', ja: 'GNSSセンサシミュレーション', 'zh-TW': 'GNSS 感測器模擬', ar: 'محاكاة مستشعر GNSS', fr: 'Simulation de capteur GNSS', de: 'GNSS-Sensorsimulation', es: 'Simulación de sensor GNSS' },
  'apis & integration tools': { ko: 'API & 통합 도구', en: 'APIs & Integration Tools', ja: 'API & 統合ツール', 'zh-TW': 'API 與整合工具', ar: 'واجهات برمجة التطبيقات وأدوات التكامل', fr: "API et outils d'intégration", de: 'APIs & Integrationstools', es: 'APIs y herramientas de integración' },

  // ── 레이더 ──
  'radar processing & display': { ko: '레이더 처리 & 디스플레이', en: 'Radar Processing & Display', ja: 'レーダー処理＆表示', 'zh-TW': '雷達處理與顯示', ar: 'معالجة وعرض الرادار', fr: 'Traitement et affichage radar', de: 'Radarverarbeitung & -anzeige', es: 'Procesamiento y visualización de radar' },

  // ── 인터커넥트 / GPU ──
  'high-speed data interconnect': { ko: '초고속 데이터 인터커넥트', en: 'High-Speed Data Interconnect', ja: '高速データインターコネクト', 'zh-TW': '高速資料互連', ar: 'الربط البيني عالي السرعة للبيانات', fr: 'Interconnexion de données haute vitesse', de: 'Hochgeschwindigkeits-Dateninterconnect', es: 'Interconexión de datos de alta velocidad' },
  'superfast interconnect switch': { ko: '초고속 인터커넥트 스위치', en: 'Superfast Interconnect Switch', ja: '超高速インターコネクトスイッチ', 'zh-TW': '超高速互連交換器', ar: 'مفتاح الربط البيني فائق السرعة', fr: "Commutateur d'interconnexion ultra-rapide", de: 'Ultraschneller Interconnect-Switch', es: 'Conmutador de interconexión ultrarrápida' },
  'gpu': { ko: 'GPU', en: 'GPU', ja: 'GPU', 'zh-TW': 'GPU', ar: 'وحدة معالجة الرسوميات (GPU)', fr: 'GPU', de: 'GPU', es: 'GPU' },
  'gpu appliances': { ko: 'GPU 어플라이언스', en: 'GPU Appliances', ja: 'GPUアプライアンス', 'zh-TW': 'GPU 設備', ar: 'أجهزة GPU', fr: 'Appliances GPU', de: 'GPU-Appliances', es: 'Equipos GPU' },

  // ── 네트워크 어플라이언스 / 어댑터 ──
  'entry network appliance': { ko: '엔트리 네트워크 어플라이언스', en: 'Entry Network Appliance', ja: 'エントリーネットワークアプライアンス', 'zh-TW': '入門級網路設備', ar: 'جهاز شبكة من المستوى المبتدئ', fr: "Appliance réseau d'entrée de gamme", de: 'Einstiegs-Netzwerk-Appliance', es: 'Dispositivo de red de nivel inicial' },
  'middle network appliance': { ko: '미들 네트워크 어플라이언스', en: 'Middle Network Appliance', ja: 'ミドルクラスネットワークアプライアンス', 'zh-TW': '中階網路設備', ar: 'جهاز شبكة من المستوى المتوسط', fr: 'Appliance réseau milieu de gamme', de: 'Mittelklasse-Netzwerk-Appliance', es: 'Dispositivo de red de gama media' },
  'high-end network appliance': { ko: '하이엔드 네트워크 어플라이언스', en: 'High-end Network Appliance', ja: 'ハイエンドネットワークアプライアンス', 'zh-TW': '高階網路設備', ar: 'جهاز شبكة عالي المستوى', fr: 'Appliance réseau haut de gamme', de: 'High-End-Netzwerk-Appliance', es: 'Dispositivo de red de gama alta' },
  'server network appliance': { ko: '서버 네트워크 어플라이언스', en: 'Server Network Appliance', ja: 'サーバーネットワークアプライアンス', 'zh-TW': '伺服器網路設備', ar: 'جهاز شبكة الخادم', fr: 'Appliance réseau serveur', de: 'Server-Netzwerk-Appliance', es: 'Dispositivo de red de servidor' },
  'customized network appliance': { ko: '커스터마이즈 네트워크 어플라이언스', en: 'Customized Network Appliance', ja: 'カスタマイズ型ネットワークアプライアンス', 'zh-TW': '客製化網路設備', ar: 'جهاز شبكة مخصص', fr: 'Appliance réseau personnalisée', de: 'Angepasste Netzwerk-Appliance', es: 'Dispositivo de red personalizado' },
  'network nic adapter': { ko: '네트워크 NIC 어댑터', en: 'Network NIC Adapter', ja: 'ネットワークNICアダプタ', 'zh-TW': '網路介面卡 (NIC)', ar: 'محول بطاقة الشبكة (NIC)', fr: 'Adaptateur NIC réseau', de: 'Netzwerk-NIC-Adapter', es: 'Adaptador NIC de red' },
  'network nics adapter': { ko: '네트워크 NIC 어댑터', en: 'Network NICs Adapter', ja: 'ネットワークNICアダプタ', 'zh-TW': '網路介面卡 (NIC)', ar: 'محول بطاقة الشبكة (NIC)', fr: 'Adaptateur NIC réseau', de: 'Netzwerk-NIC-Adapter', es: 'Adaptador NIC de red' },
  'pcie network adapter': { ko: 'PCIe 네트워크 어댑터', en: 'PCIe Network Adapter', ja: 'PCIeネットワークアダプタ', 'zh-TW': 'PCIe 網路卡', ar: 'محول شبكة PCIe', fr: 'Adaptateur réseau PCIe', de: 'PCIe-Netzwerkadapter', es: 'Adaptador de red PCIe' },
};

/** 카테고리/기술 용어 수동 번역 적용 — Google Translate 오역 방지용 */
export function applyManualOverrides(lang: string) {
  const selectors = '.cat-toc-link, .cat-section-title, .mega-title, .mega-item, .heading-page';
  document.querySelectorAll<HTMLElement>(selectors).forEach((el) => {
    // 원본 텍스트를 별도 속성에 1회만 기록 (auto-translate 마커와 충돌 방지)
    let original = el.getAttribute('data-i18n-manual-original');
    if (!original) {
      const txt = (el.textContent || '').trim();
      if (!txt) return;
      original = txt;
      el.setAttribute('data-i18n-manual-original', original);
    }
    const key = original.toLowerCase().trim();
    const override = MANUAL_OVERRIDES[key];
    if (override && override[lang as Lang]) {
      const translated = override[lang as Lang]!;
      if ((el.textContent || '').trim() !== translated) el.textContent = translated;
      // autoTranslatePage(Google)가 덮어쓰지 않도록 translate="no" 마킹
      if (el.getAttribute('translate') !== 'no') el.setAttribute('translate', 'no');
    }
    // 사전에 없는 텍스트는 건드리지 않고 기존 번역 흐름(정적 i18n / Google)에 맡김
  });
}
