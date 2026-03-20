import { useState, useEffect, useRef, useCallback } from "react";

// ─── THEMES ──────────────────────────────────────────────────────────────────
const THEMES = {
  midnight: { name:"Midnight",  dark:true,  bg:"#0d0d1a", card:"#16162e", border:"#2d2d55", text:"#e2e8f0", muted:"#6b7280", accent:"#818cf8", accentText:"#ffffff", ok:"#34d399", danger:"#f87171" },
  carbon:   { name:"Carbon",    dark:true,  bg:"#0a0a0a", card:"#1a1a1a", border:"#2e2e2e", text:"#e5e5e5", muted:"#737373", accent:"#f59e0b", accentText:"#000000", ok:"#34d399", danger:"#f87171" },
  forest:   { name:"Forêt",     dark:true,  bg:"#071a0f", card:"#0d2418", border:"#1a3d25", text:"#d1fae5", muted:"#6b7280", accent:"#34d399", accentText:"#000000", ok:"#34d399", danger:"#f87171" },
  ocean:    { name:"Océan",     dark:true,  bg:"#050f1e", card:"#0a1e38", border:"#1a3558", text:"#bfdbfe", muted:"#64748b", accent:"#38bdf8", accentText:"#000000", ok:"#34d399", danger:"#f87171" },
  crimson:  { name:"Crimson",   dark:true,  bg:"#120408", card:"#200812", border:"#40101e", text:"#fecdd3", muted:"#9f1239", accent:"#fb7185", accentText:"#000000", ok:"#34d399", danger:"#f87171" },
  snow:     { name:"Blanc",     dark:false, bg:"#f8fafc", card:"#ffffff", border:"#e2e8f0", text:"#1e293b", muted:"#94a3b8", accent:"#3b82f6", accentText:"#ffffff", ok:"#10b981", danger:"#ef4444" },
  sky:      { name:"Ciel",      dark:false, bg:"#eff6ff", card:"#ffffff", border:"#bfdbfe", text:"#1e3a5f", muted:"#64748b", accent:"#2563eb", accentText:"#ffffff", ok:"#10b981", danger:"#ef4444" },
  mint:     { name:"Menthe",    dark:false, bg:"#f0fdf4", card:"#ffffff", border:"#bbf7d0", text:"#14532d", muted:"#6b7280", accent:"#059669", accentText:"#ffffff", ok:"#059669", danger:"#ef4444" },
};

// ─── RHYTHMS ─────────────────────────────────────────────────────────────────
const RHYTHMS = {
  progressif: { label:"Progressif", emoji:"🌱", pct:8,  colorHex:"#10b981", desc:"−8 % par semaine", detail:"Idéal pour une dépendance faible. Réduction douce et durable." },
  modere:     { label:"Modéré",     emoji:"⚡", pct:15, colorHex:"#3b82f6", desc:"−15 % par semaine", detail:"Bon équilibre entre confort et efficacité." },
  rapide:     { label:"Rapide",     emoji:"🚀", pct:25, colorHex:"#ef4444", desc:"−25 % par semaine", detail:"Pour ceux qui veulent arrêter rapidement." },
};

// ─── MOTIVATIONAL MESSAGES ───────────────────────────────────────────────────
const MOTIV = (n) => [
  `💪 Courage ${n} ! Vous tenez bon !`,
  `🧠 Chaque minute d'abstention renforce votre volonté.`,
  `🌟 Vous faites un travail incroyable, ${n} !`,
  `🎯 La discipline d'aujourd'hui, c'est la liberté de demain.`,
  `🔥 ${n}, vous êtes plus fort(e) que cette envie !`,
  `🌈 Chaque effort compte. Continuez comme ça !`,
  `⏳ La patience est votre superpouvoir, ${n}.`,
  `💡 Votre santé vous remercie de chaque minute d'abstention.`,
  `🏆 ${n}, vous êtes en train de gagner cette bataille !`,
  `🍃 Respirez profondément. L'envie va passer.`,
  `🧘 Quelques secondes de respiration profonde et ça va aller.`,
  `✨ Vous avancez. C'est tout ce qui compte, ${n}.`,
];

// ─── UTILS ───────────────────────────────────────────────────────────────────
const pad2   = n => String(Math.max(0, Math.floor(n))).padStart(2, "0");
const hms    = s => { if (s <= 0) return "00:00"; const h=Math.floor(s/3600),m=Math.floor((s%3600)/60),sc=s%60; return h>0?`${pad2(h)}:${pad2(m)}:${pad2(sc)}`:`${pad2(m)}:${pad2(sc)}`; };
const hhmm   = m => `${pad2(Math.floor(m/60)%24)}:${pad2(m%60)}`;
const getNow = () => { const d=new Date(); return d.getHours()*3600+d.getMinutes()*60+d.getSeconds(); };

const buildSchedule = ({ limit, sessions, wake, sleep }) => {
  const dur = Math.max(1, Math.round(limit / sessions));
  const gap = Math.max(5, Math.round(((sleep - wake) * 60 - dur * sessions) / sessions));
  const out = []; let cur = wake * 60;
  for (let i = 0; i < sessions; i++) {
    out.push({ id:i, start:cur, baseDur:dur, bonus:0, status:"pending" });
    cur += dur + gap;
  }
  return out;
};

const genPlan = (startMins, pct) => {
  const rows = []; let cur = startMins, w = 1;
  while (cur >= 2) { rows.push({ w, mins: Math.round(cur) }); cur *= (1 - pct / 100); w++; }
  rows.push({ w, mins: 0 });
  return rows;
};

const scoreAddiction = (ans) => {
  let sc = 0, startMins = 60;
  if (ans.freq === "lt5")    { sc += 0; startMins = 35; }
  if (ans.freq === "5to15")  { sc += 1; startMins = 60; }
  if (ans.freq === "15to30") { sc += 2; startMins = 90; }
  if (ans.freq === "gt30")   { sc += 3; startMins = 120; }
  if (ans.morning === "yes") sc += 2;
  sc += { never:0, sometimes:1, often:2, always:3 }[ans.anxiety] || 0;
  sc += { lt6m:0, s6m2y:1, s2to5:2, gt5:3 }[ans.duration] || 0;
  const recommended = sc <= 3 ? "progressif" : sc <= 7 ? "modere" : "rapide";
  const level = sc <= 3 ? "Faible dépendance" : sc <= 7 ? "Dépendance modérée" : "Forte dépendance";
  return { sc, recommended, level, startMins };
};

// ─── SVG ICONS ───────────────────────────────────────────────────────────────
const IcHome = ({ color }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
    <polyline points="9 22 9 12 15 12 15 22"/>
  </svg>
);

const IcCalendar = ({ color }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2"/>
    <line x1="16" y1="2" x2="16" y2="6"/>
    <line x1="8" y1="2" x2="8" y2="6"/>
    <line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
);

const IcTrend = ({ color }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
    <polyline points="17 6 23 6 23 12"/>
  </svg>
);

const IcSettings = ({ color }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
  </svg>
);

const IcShare = ({ color }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8"/>
    <polyline points="16 6 12 2 8 6"/>
    <line x1="12" y1="2" x2="12" y2="15"/>
  </svg>
);

const IcPlus = ({ color }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round">
    <line x1="12" y1="5" x2="12" y2="19"/>
    <line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);

const IcBell = ({ color }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
    <path d="M13.73 21a2 2 0 01-3.46 0"/>
  </svg>
);

// ─── INSTALL BANNER ──────────────────────────────────────────────────────────
function InstallBanner({ T }) {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [visible, setVisible] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const alreadyInstalled =
      window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone === true;
    if (alreadyInstalled) return;
    if (localStorage.getItem("vd_install_dismissed")) return;

    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
    setIsIOS(ios);
    if (ios) { setVisible(true); return; }

    const handler = (e) => { e.preventDefault(); setDeferredPrompt(e); setVisible(true); };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const install = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      setDeferredPrompt(null);
    }
    setVisible(false);
  };

  const dismiss = () => {
    setVisible(false);
    localStorage.setItem("vd_install_dismissed", "1");
  };

  if (!visible) return null;

  return (
    <div style={{
      margin: "0 16px 12px",
      background: T.dark
        ? `linear-gradient(135deg, ${T.accent}28, ${T.accent}10)`
        : `linear-gradient(135deg, ${T.accent}18, ${T.accent}08)`,
      border: `1.5px solid ${T.accent}55`,
      borderRadius: 18,
      padding: "14px 16px",
      display: "flex",
      alignItems: "center",
      gap: 12,
    }}>
      {/* Icon */}
      <div style={{
        width: 44, height: 44, borderRadius: 12, background: T.accent,
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        boxShadow: `0 4px 12px ${T.accent}55`,
      }}>
        <span style={{ fontSize: 22 }}>💨</span>
      </div>

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 2 }}>
          Installer VapeDown
        </div>
        {isIOS ? (
          <div style={{ fontSize: 11, color: T.muted, lineHeight: 1.4 }}>
            Appuyez sur{" "}
            <span style={{ display: "inline-flex", verticalAlign: "middle", margin: "0 2px" }}>
              <IcShare color={T.accent} />
            </span>{" "}
            puis <strong style={{ color: T.text }}>"Sur l'écran d'accueil"</strong>
          </div>
        ) : (
          <div style={{ fontSize: 11, color: T.muted }}>
            Accès rapide depuis votre écran d'accueil
          </div>
        )}
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
        {!isIOS && (
          <button onClick={install} style={{
            background: T.accent, color: T.accentText, border: "none",
            borderRadius: 10, padding: "8px 14px", fontSize: 12, fontWeight: 700,
            cursor: "pointer", display: "flex", alignItems: "center", gap: 4,
          }}>
            <IcPlus color={T.accentText} />
            Ajouter
          </button>
        )}
        <button onClick={dismiss} style={{
          background: T.border, color: T.muted, border: "none",
          borderRadius: 10, width: 32, height: 32, fontSize: 16, cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700,
        }}>×</button>
      </div>
    </div>
  );
}

// ─── ONBOARDING ───────────────────────────────────────────────────────────────
function Onboarding({ onComplete, T }) {
  const [step, setStep]         = useState(0);
  const [name, setName]         = useState("");
  const [ans, setAns]           = useState({});
  const [result, setResult]     = useState(null);
  const [rhythm, setRhythm]     = useState(null);
  const [sessions, setSessions] = useState(6);

  const QUESTIONS = [
    { key:"freq",    q:"Combien de fois vapotez-vous par jour ?", opts:[
      { v:"lt5",    l:"Moins de 5 fois",  s:"Usage très léger" },
      { v:"5to15",  l:"5 à 15 fois",      s:"Usage modéré" },
      { v:"15to30", l:"15 à 30 fois",     s:"Usage intensif" },
      { v:"gt30",   l:"Plus de 30 fois",  s:"Usage très intensif" },
    ]},
    { key:"morning", q:"Vapotez-vous dans les 30 min après le réveil ?", opts:[
      { v:"no",  l:"Non",  s:"Je peux attendre sans problème" },
      { v:"yes", l:"Oui",  s:"C'est souvent mon premier réflexe" },
    ]},
    { key:"anxiety", q:"Comment vous sentez-vous sans pouvoir vapoter ?", opts:[
      { v:"never",     l:"Serein(e)",         s:"Aucune anxiété particulière" },
      { v:"sometimes", l:"Légèrement gêné(e)", s:"Un peu distrait(e)" },
      { v:"often",     l:"Anxieux(se)",        s:"Difficile de me concentrer" },
      { v:"always",    l:"Très irritable",     s:"Je pense à ça constamment" },
    ]},
    { key:"duration", q:"Depuis combien de temps vapotez-vous ?", opts:[
      { v:"lt6m",  l:"Moins de 6 mois", s:"Habitude récente" },
      { v:"s6m2y", l:"6 mois à 2 ans",  s:"Habitude installée" },
      { v:"s2to5", l:"2 à 5 ans",       s:"Habitude profonde" },
      { v:"gt5",   l:"Plus de 5 ans",   s:"Habitude très ancrée" },
    ]},
  ];

  const pick = (key, val) => {
    const newAns = { ...ans, [key]: val };
    setAns(newAns);
    if (step - 1 === QUESTIONS.length - 1) {
      const r = scoreAddiction(newAns);
      setResult(r); setRhythm(r.recommended); setStep(step + 1);
    } else { setStep(step + 1); }
  };

  const card = {
    minHeight: "100dvh",
    background: T.bg,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "env(safe-area-inset-top, 20px) 16px env(safe-area-inset-bottom, 20px)",
    fontFamily: "'Poppins', system-ui, sans-serif",
  };

  const inner = {
    background: T.card,
    borderRadius: 28,
    padding: "32px 24px",
    maxWidth: 400,
    width: "100%",
    boxShadow: T.dark ? "0 20px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.05)" : "0 8px 40px rgba(0,0,0,0.12)",
    border: `1px solid ${T.border}`,
  };

  const optBtn = (sel, col) => ({
    display: "block", width: "100%", textAlign: "left",
    background: sel ? (col || T.accent) + "18" : "transparent",
    border: `2px solid ${sel ? (col || T.accent) : T.border}`,
    borderRadius: 16, padding: "14px 16px", marginBottom: 10,
    cursor: "pointer", transition: "all 0.15s",
    transform: sel ? "scale(1.01)" : "scale(1)",
  });

  const primaryBtn = (col) => ({
    background: col || T.accent, color: T.accentText,
    border: "none", borderRadius: 16, padding: "16px 24px",
    fontSize: 16, fontWeight: 700, width: "100%", cursor: "pointer",
    marginTop: 16, boxShadow: `0 4px 20px ${(col || T.accent)}55`,
    transition: "transform 0.1s",
  });

  // Step 0 — Welcome & Name
  if (step === 0) return (
    <div style={card}>
      <div style={inner}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{
            width: 80, height: 80, borderRadius: 24, margin: "0 auto 16px",
            background: `linear-gradient(135deg, ${T.accent}, ${T.accent}88)`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 40, boxShadow: `0 8px 30px ${T.accent}44`,
          }}>💨</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: T.text, letterSpacing: "-0.5px" }}>VapeDown</div>
          <div style={{ fontSize: 14, color: T.muted, marginTop: 6, lineHeight: 1.6 }}>
            Votre programme personnalisé pour<br/>réduire progressivement le vapotage.
          </div>
        </div>

        <label style={{ fontSize: 13, fontWeight: 600, color: T.text, display: "block", marginBottom: 8 }}>
          Votre prénom
        </label>
        <input
          style={{
            width: "100%", background: T.bg, border: `2px solid ${T.border}`,
            borderRadius: 14, padding: "14px 16px", fontSize: 16, color: T.text,
            outline: "none", boxSizing: "border-box", fontFamily: "'Poppins', system-ui, sans-serif",
            transition: "border-color 0.15s",
          }}
          placeholder="Ex : Marie"
          value={name}
          autoFocus
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === "Enter" && name.trim() && setStep(1)}
          onFocus={e => e.target.style.borderColor = T.accent}
          onBlur={e => e.target.style.borderColor = T.border}
        />
        <button
          style={{ ...primaryBtn(), opacity: name.trim() ? 1 : 0.45 }}
          onClick={() => name.trim() && setStep(1)}
        >
          Commencer l'évaluation →
        </button>
      </div>
    </div>
  );

  // Steps 1-4 — Questions
  const qi = step - 1;
  if (qi >= 0 && qi < QUESTIONS.length) {
    const Q = QUESTIONS[qi];
    return (
      <div style={card}>
        <div style={inner}>
          {/* Progress dots */}
          <div style={{ display: "flex", gap: 6, justifyContent: "center", marginBottom: 28 }}>
            {QUESTIONS.map((_, i) => (
              <div key={i} style={{
                height: 6, borderRadius: 3,
                width: i === qi ? 28 : 8,
                background: i <= qi ? T.accent : T.border,
                transition: "all 0.3s",
              }} />
            ))}
          </div>

          <div style={{ fontSize: 12, color: T.muted, marginBottom: 8, textAlign: "center" }}>
            Bonjour {name} · Question {qi + 1}/{QUESTIONS.length}
          </div>
          <div style={{ fontSize: 19, fontWeight: 700, color: T.text, textAlign: "center", marginBottom: 22, lineHeight: 1.3 }}>
            {Q.q}
          </div>

          {Q.opts.map(o => (
            <button key={o.v} style={optBtn(ans[Q.key] === o.v)} onClick={() => pick(Q.key, o.v)}>
              <div style={{ fontSize: 15, fontWeight: 600, color: T.text }}>{o.l}</div>
              <div style={{ fontSize: 12, color: T.muted, marginTop: 2 }}>{o.s}</div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Step 5 — Results
  if (result) return (
    <div style={{ ...card, alignItems: "flex-start", overflowY: "auto" }}>
      <div style={{ ...inner, margin: "24px auto" }}>
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <div style={{ fontSize: 44, marginBottom: 8 }}>📊</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: T.text }}>Votre profil, {name}</div>
        </div>

        <div style={{
          background: T.accent + "18", border: `2px solid ${T.accent}44`,
          borderRadius: 18, padding: "16px", marginBottom: 20, textAlign: "center",
        }}>
          <div style={{ fontSize: 11, color: T.muted, marginBottom: 4, textTransform: "uppercase", letterSpacing: 1 }}>
            Dépendance estimée
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, color: T.text }}>{result.level}</div>
          <div style={{ fontSize: 12, color: T.muted, marginTop: 4 }}>
            Limite de départ : <strong style={{ color: T.accent }}>{result.startMins} min/jour</strong>
          </div>
        </div>

        <div style={{ fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 10 }}>
          Choisissez votre rythme :
        </div>
        {Object.entries(RHYTHMS).map(([k, r]) => {
          const sel = rhythm === k, isRec = result.recommended === k;
          return (
            <button key={k} style={optBtn(sel, r.colorHex)} onClick={() => setRhythm(k)}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: T.text }}>
                    {r.emoji} {r.label}
                    <span style={{ fontSize: 12, color: T.muted, fontWeight: 400 }}> · {r.desc}</span>
                  </div>
                  <div style={{ fontSize: 12, color: T.muted, marginTop: 2 }}>{r.detail}</div>
                </div>
                {isRec && (
                  <div style={{
                    background: r.colorHex, color: "#fff", borderRadius: 999,
                    padding: "3px 10px", fontSize: 10, fontWeight: 700, flexShrink: 0, marginLeft: 8,
                  }}>Recommandé</div>
                )}
              </div>
            </button>
          );
        })}

        <div style={{ marginTop: 20, marginBottom: 8 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: T.text, marginBottom: 10 }}>
            Sessions de vapotage par jour
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {[3, 4, 5, 6, 8, 10].map(n => (
              <button key={n} onClick={() => setSessions(n)} style={{
                flex: 1, padding: "11px 0", borderRadius: 12,
                border: `2px solid ${sessions === n ? T.accent : T.border}`,
                background: sessions === n ? T.accent + "22" : T.bg,
                color: sessions === n ? T.accent : T.text,
                fontWeight: 700, cursor: "pointer", fontSize: 14,
                transition: "all 0.15s",
              }}>{n}</button>
            ))}
          </div>
        </div>

        <button
          style={primaryBtn(RHYTHMS[rhythm || "modere"].colorHex)}
          onClick={() => rhythm && onComplete({ name, rhythm, startMins: result.startMins, sessions, week: 1, level: result.level })}
        >
          🚀 Démarrer mon programme
        </button>
      </div>
    </div>
  );

  return null;
}

// ─── STORAGE HELPERS ─────────────────────────────────────────────────────────
const LS = {
  get: (key, fallback) => { try { const v = localStorage.getItem(key); return v !== null ? JSON.parse(v) : fallback; } catch { return fallback; } },
  set: (key, val)      => { try { localStorage.setItem(key, JSON.stringify(val)); } catch {} },
  del: (key)           => { try { localStorage.removeItem(key); } catch {} },
};
const todayKey = () => new Date().toISOString().slice(0, 10);

// ─── ROOT ─────────────────────────────────────────────────────────────────────
export default function VapeControl() {
  const [profile,   setProfile]   = useState(() => LS.get("vd_profile", null));
  const [cfg,       setCfg]       = useState(() => LS.get("vd_cfg", { sessions:6, wake:7, sleep:23, week:1 }));
  const [sched,     setSched]     = useState([]);
  const [nowSec,    setNowSec]    = useState(getNow());
  const [tab,       setTab]       = useState("home");
  const [notifOn,   setNotifOn]   = useState(false);
  const [themeName, setThemeName] = useState(() => LS.get("vd_theme", "midnight"));
  const [editCfg,   setEditCfg]   = useState(() => LS.get("vd_cfg", { sessions:6, wake:7, sleep:23, week:1 }));
  const notifSent = useRef(new Set());
  const T = THEMES[themeName];

  // Persist state to localStorage
  useEffect(() => { LS.set("vd_profile",  profile);   }, [profile]);
  useEffect(() => { LS.set("vd_cfg",      cfg);        }, [cfg]);
  useEffect(() => { LS.set("vd_theme",    themeName);  }, [themeName]);
  useEffect(() => { if (sched.length > 0) LS.set("vd_sched", { date: todayKey(), sched }); }, [sched]);

  useEffect(() => { const id = setInterval(() => setNowSec(getNow()), 1000); return () => clearInterval(id); }, []);
  useEffect(() => { if ("Notification" in window && Notification.permission === "granted") setNotifOn(true); }, []);

  const push = useCallback((title, body) => {
    if (notifOn && "Notification" in window) try { new Notification(title, { body }); } catch {}
  }, [notifOn]);

  const askNotif = async () => {
    if (!("Notification" in window)) return;
    const p = await Notification.requestPermission(); setNotifOn(p === "granted");
  };

  useEffect(() => {
    if (!profile) return;

    // Always try to restore today's stored schedule first.
    // applySettings deletes vd_sched only when cfg truly changed,
    // so if nothing changed the stored schedule is preserved.
    const stored = LS.get("vd_sched", null);
    if (stored && stored.date === todayKey() && Array.isArray(stored.sched) && stored.sched.length > 0) {
      setSched(stored.sched);
      return;
    }

    // No valid stored schedule — generate a fresh one (new day, new profile, or real cfg change)
    const plan = genPlan(profile.startMins, RHYTHMS[profile.rhythm].pct);
    const limit = plan[cfg.week - 1]?.mins ?? 0;
    setSched(buildSchedule({ limit, sessions: cfg.sessions, wake: cfg.wake, sleep: cfg.sleep }));
    notifSent.current.clear();
  }, [profile, cfg]);

  const effEnd     = s => s.start + s.baseDur + s.bonus;
  const nowMin     = Math.floor(nowSec / 60);
  const curSess    = sched.find(s => s.status === "pending" && nowMin >= s.start && nowMin < effEnd(s));
  const nextSess   = sched.find(s => s.status === "pending" && s.start > nowMin);
  const isVaping   = !!curSess;
  const secsLeft   = curSess  ? Math.max(0, effEnd(curSess)  * 60 - nowSec) : 0;
  const secsToNext = nextSess ? Math.max(0, nextSess.start   * 60 - nowSec) : 0;

  useEffect(() => {
    if (!profile) return;
    const msgs = MOTIV(profile.name);
    const rnd = () => msgs[Math.floor(Math.random() * msgs.length)];
    sched.forEach(s => {
      if (s.status !== "pending") return;
      const end = effEnd(s);
      const kS = `S${s.id}`;
      if (nowMin === s.start && !notifSent.current.has(kS)) {
        notifSent.current.add(kS);
        push("🟢 À vous de jouer !", `Session de ${s.baseDur + s.bonus} min autorisée. Profitez-en !`);
      }
      const kW = `W${s.id}`;
      if (nowMin === end - 1 && !notifSent.current.has(kW)) {
        notifSent.current.add(kW);
        push("⚠️ 1 minute restante", "Terminez bientôt votre session.");
      }
      const kE = `E${s.id}`;
      if (nowMin >= end && !notifSent.current.has(kE)) {
        notifSent.current.add(kE);
        push("🔴 Session terminée", nextSess ? `Prochaine session à ${hhmm(nextSess.start)} — tenez bon !` : "Journée terminée ! Bravo 🎉");
        setSched(p => p.map(x => x.id === s.id ? { ...x, status: "done" } : x));
      }
    });
    if (!isVaping && nextSess) {
      const abstDur = nextSess.start * 60 - (curSess ? effEnd(curSess) * 60 : nowSec);
      const halfway = nextSess.start * 60 - Math.round(abstDur / 2);
      const fifteenB = nextSess.start * 60 - 15 * 60;
      const kMH = `MH${nextSess.id}`;
      if (nowSec >= halfway && nowSec < halfway + 60 && !notifSent.current.has(kMH)) {
        notifSent.current.add(kMH); push("✨ Motivation", rnd());
      }
      const kM15 = `M15${nextSess.id}`;
      if (nowSec >= fifteenB && nowSec < fifteenB + 60 && !notifSent.current.has(kM15)) {
        notifSent.current.add(kM15);
        push("⏰ Bientôt !", `Plus que 15 min, ${profile.name} ! Prochaine session à ${hhmm(nextSess.start)}.`);
      }
    }
  }, [nowMin, nowSec, sched, push, profile, isVaping, nextSess, curSess]);

  const skipSession = () => {
    if (!curSess || !profile) return;
    const dur = curSess.baseDur + curSess.bonus;
    const rec = Math.round(dur * 0.75);
    const futIds = sched.filter(s => s.status === "pending" && s.id !== curSess.id && s.start > nowMin).map(s => s.id);
    const bonus = futIds.length > 0 ? Math.floor(rec / futIds.length) : 0;
    setSched(p => p.map(s => {
      if (s.id === curSess.id) return { ...s, status: "skipped" };
      if (futIds.includes(s.id)) return { ...s, bonus: s.bonus + bonus };
      return s;
    }));
    push("⏭️ Session reportée", futIds.length > 0 ? `+${bonus} min redistribuées.` : "Aucune session restante.");
  };

  const cfgChanged = (a, b) =>
    a.sessions !== b.sessions || a.wake !== b.wake || a.sleep !== b.sleep || a.week !== b.week;

  const applySettings = () => {
    if (cfgChanged(editCfg, cfg)) {
      LS.del("vd_sched"); // Invalidate cached schedule only when something really changed
    }
    setCfg(editCfg);
    setTab("home");
  };

  const resetAll = () => {
    if (!window.confirm("Recommencer l'évaluation depuis le début ?")) return;
    LS.del("vd_profile"); LS.del("vd_cfg"); LS.del("vd_sched");
    const defaultCfg = { sessions:6, wake:7, sleep:23, week:1 };
    setCfg(defaultCfg); setEditCfg(defaultCfg); setProfile(null);
  };

  const plan       = profile ? genPlan(profile.startMins, RHYTHMS[profile.rhythm].pct) : [];
  const todayLimit = plan[cfg.week - 1]?.mins ?? 0;
  const statDone   = sched.filter(s => s.status === "done").length;
  const statSkipped = sched.filter(s => s.status === "skipped").length;
  const vapedMins  = sched.filter(s => s.status === "done").reduce((a, s) => a + s.baseDur + s.bonus, 0);
  const dayDone    = !isVaping && secsToNext === 0 && sched.length > 0;

  if (!profile) return <Onboarding T={T} onComplete={p => { setProfile(p); setCfg(c => ({ ...c, sessions: p.sessions })); setEditCfg(c => ({ ...c, sessions: p.sessions })); }} />;

  const NAV = [
    { id:"home",     Icon:IcHome,     label:"Accueil"     },
    { id:"today",    Icon:IcCalendar, label:"Aujourd'hui" },
    { id:"plan",     Icon:IcTrend,    label:"Programme"   },
    { id:"settings", Icon:IcSettings, label:"Réglages"    },
  ];

  const headerGrad = isVaping
    ? `linear-gradient(135deg, ${T.ok}ee, ${T.ok}99)`
    : `linear-gradient(135deg, ${T.accent}ee, ${T.accent}99)`;

  return (
    <div style={{
      fontFamily: "'Poppins', system-ui, sans-serif",
      maxWidth: 430, margin: "0 auto",
      minHeight: "100dvh",
      display: "flex", flexDirection: "column",
      background: T.bg,
    }}>

      {/* Header */}
      <div style={{
        background: headerGrad,
        color: "white",
        padding: `calc(env(safe-area-inset-top, 0px) + 14px) 20px 14px`,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        boxShadow: T.dark ? "0 4px 20px rgba(0,0,0,0.5)" : "0 2px 12px rgba(0,0,0,0.15)",
        position: "sticky", top: 0, zIndex: 10,
      }}>
        <div>
          <div style={{ fontSize: 11, opacity: 0.8, marginBottom: 1 }}>
            Bonjour {profile.name} · Sem. {cfg.week}
          </div>
          <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: "-0.3px" }}>
            💨 VapeDown
          </div>
        </div>
        <div style={{
          background: "rgba(255,255,255,0.2)", borderRadius: 12, padding: "6px 12px",
          fontSize: 12, fontWeight: 600, backdropFilter: "blur(8px)",
        }}>
          {RHYTHMS[profile.rhythm].emoji} {RHYTHMS[profile.rhythm].label}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: "auto", paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 76px)" }}>
        {tab === "home"     && <HomeView     {...{isVaping,secsLeft,secsToNext,curSess,nextSess,sched,statDone,statSkipped,vapedMins,todayLimit,cfg,profile,plan,dayDone,skipSession,notifOn,askNotif,effEnd,T}} />}
        {tab === "today"    && <TodayView    {...{sched,nowMin,effEnd,T}} />}
        {tab === "plan"     && <PlanView     {...{plan,cfg,profile,T}} />}
        {tab === "settings" && <SettingsView {...{editCfg,setEditCfg,cfg,profile,apply:applySettings,resetAll,themeName,setThemeName,T}} />}
      </div>

      {/* Bottom Nav */}
      <div style={{
        position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)",
        width: "100%", maxWidth: 430,
        background: T.dark ? T.card + "f0" : T.card,
        borderTop: `1px solid ${T.border}`,
        display: "flex",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        boxShadow: "0 -4px 20px rgba(0,0,0,0.15)",
      }}>
        {NAV.map(({ id, Icon, label }) => {
          const active = tab === id;
          return (
            <button key={id} onClick={() => setTab(id)} style={{
              flex: 1, padding: "10px 0 8px", border: "none",
              background: "transparent",
              cursor: "pointer",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
              transition: "opacity 0.15s",
            }}>
              <div style={{
                width: 44, height: 32, borderRadius: 10,
                display: "flex", alignItems: "center", justifyContent: "center",
                background: active ? T.accent + "22" : "transparent",
                transition: "background 0.2s",
              }}>
                <Icon color={active ? T.accent : T.muted} />
              </div>
              <span style={{ fontSize: 10, fontWeight: active ? 700 : 400, color: active ? T.accent : T.muted }}>
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── HOME VIEW ───────────────────────────────────────────────────────────────
function HomeView({ isVaping, secsLeft, secsToNext, curSess, nextSess, sched, statDone, statSkipped, vapedMins, todayLimit, cfg, profile, plan, dayDone, skipSession, notifOn, askNotif, effEnd, T }) {
  const progress = cfg.sessions > 0 ? statDone / cfg.sessions : 0;
  const sessIdx  = curSess ? sched.findIndex(s => s === curSess) + 1 : 0;

  const stateColor = isVaping || dayDone ? T.ok : T.danger;
  const stateBg    = (isVaping || dayDone ? T.ok : T.danger) + "14";
  const stateBorder = (isVaping || dayDone ? T.ok : T.danger) + "44";

  return (
    <div style={{ padding: "16px 16px 8px" }}>

      {/* Install Banner */}
      <InstallBanner T={T} />

      {/* Notification banner */}
      {!notifOn && (
        <div style={{
          background: T.accent + "14", border: `1.5px solid ${T.accent}44`,
          borderRadius: 16, padding: "12px 16px", marginBottom: 14,
          display: "flex", alignItems: "center", gap: 12,
        }}>
          <div style={{ flexShrink: 0, opacity: 0.8 }}>
            <IcBell color={T.accent} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>Activez les notifications</div>
            <div style={{ fontSize: 11, color: T.muted, marginTop: 1 }}>Alertes de session et messages de motivation</div>
          </div>
          <button onClick={askNotif} style={{
            background: T.accent, color: T.accentText, border: "none",
            borderRadius: 10, padding: "8px 14px", fontSize: 12, fontWeight: 700,
            cursor: "pointer", flexShrink: 0,
          }}>Activer</button>
        </div>
      )}

      {/* Main Status Card */}
      <div style={{
        background: stateBg, border: `2px solid ${stateBorder}`,
        borderRadius: 24, padding: "28px 20px", textAlign: "center", marginBottom: 14,
        boxShadow: `0 8px 30px ${stateColor}18`,
      }}>
        {/* Status badge */}
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          background: stateColor + "22", color: stateColor,
          borderRadius: 999, padding: "6px 16px", fontWeight: 700, fontSize: 12,
          marginBottom: 20, border: `1.5px solid ${stateColor}44`,
          letterSpacing: 0.5, textTransform: "uppercase",
        }}>
          <span style={{
            display: "inline-block", width: 8, height: 8, borderRadius: "50%",
            background: stateColor,
            boxShadow: isVaping ? `0 0 8px ${T.ok}, 0 0 16px ${T.ok}88` : "none",
            animation: isVaping ? "pulse 2s infinite" : "none",
          }} />
          {isVaping ? "Vapotage autorisé" : dayDone ? "Journée terminée" : "Période d'abstention"}
        </div>

        {isVaping ? (<>
          <div style={{ fontSize: 12, color: T.muted, marginBottom: 6 }}>
            Temps restant · Session {sessIdx}/{cfg.sessions}
          </div>
          <div style={{ fontSize: 68, fontWeight: 800, color: T.ok, fontFamily: "monospace", lineHeight: 1, marginBottom: 10, letterSpacing: "-2px" }}>
            {hms(secsLeft)}
          </div>
          <div style={{ fontSize: 13, color: T.muted }}>
            Durée totale : <strong style={{ color: T.text }}>{curSess.baseDur + curSess.bonus} min</strong>
            {nextSess ? ` · Prochaine à ${hhmm(nextSess.start)}` : ""}
          </div>
        </>) : secsToNext > 0 ? (<>
          <div style={{ fontSize: 12, color: T.muted, marginBottom: 6 }}>Prochaine session dans</div>
          <div style={{ fontSize: 68, fontWeight: 800, color: T.danger, fontFamily: "monospace", lineHeight: 1, marginBottom: 10, letterSpacing: "-2px" }}>
            {hms(secsToNext)}
          </div>
          {nextSess && (
            <div style={{ fontSize: 13, color: T.muted }}>
              À <strong style={{ color: T.text }}>{hhmm(nextSess.start)}</strong> · {nextSess.baseDur + nextSess.bonus} min
            </div>
          )}
          <div style={{ marginTop: 16, background: T.accent + "12", borderRadius: 14, padding: "12px 16px" }}>
            <div style={{ fontSize: 13, color: T.text, fontStyle: "italic", lineHeight: 1.5 }}>
              {MOTIV(profile.name)[Math.floor(Date.now() / 60000) % MOTIV(profile.name).length]}
            </div>
          </div>
        </>) : (<>
          <div style={{ fontSize: 52, marginBottom: 10 }}>🎉</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: T.text, marginBottom: 6 }}>Journée terminée !</div>
          <div style={{ fontSize: 13, color: T.muted }}>{vapedMins} min vapotées · Limite : {todayLimit} min</div>
          {vapedMins < todayLimit && (
            <div style={{ fontSize: 13, color: T.ok, marginTop: 8, fontWeight: 700 }}>
              💪 {todayLimit - vapedMins} min économisées !
            </div>
          )}
        </>)}
      </div>

      {/* Skip button */}
      {isVaping && (
        <div style={{ marginBottom: 14 }}>
          <button onClick={skipSession} style={{
            background: T.card, color: T.accent, border: `2px solid ${T.accent}44`,
            borderRadius: 16, padding: "14px 20px", fontSize: 14, fontWeight: 700,
            width: "100%", cursor: "pointer",
            boxShadow: T.dark ? "0 4px 16px rgba(0,0,0,0.3)" : "0 2px 8px rgba(0,0,0,0.08)",
          }}>
            ⏭️ Je ne peux pas vapoter maintenant
          </button>
          <div style={{ textAlign: "center", fontSize: 11, color: T.muted, marginTop: 6 }}>
            Le temps sera redistribué (pénalité : 25 %)
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 14 }}>
        {[
          { l:"Sessions",  v:`${statDone}/${cfg.sessions}`, emoji:"✅" },
          { l:"Vapotées",  v:`${vapedMins}min`,             emoji:"💨" },
          { l:"Reportées", v:`${statSkipped}`,              emoji:"⏭️" },
        ].map(({ l, v, emoji }) => (
          <div key={l} style={{
            background: T.card, borderRadius: 18, padding: "16px 8px", textAlign: "center",
            boxShadow: T.dark ? "0 4px 16px rgba(0,0,0,0.3)" : "0 2px 8px rgba(0,0,0,0.07)",
            border: `1px solid ${T.border}`,
          }}>
            <div style={{ fontSize: 22, marginBottom: 4 }}>{emoji}</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: T.text }}>{v}</div>
            <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>{l}</div>
          </div>
        ))}
      </div>

      {/* Day Progress */}
      <div style={{
        background: T.card, borderRadius: 18, padding: "16px 18px",
        border: `1px solid ${T.border}`,
        boxShadow: T.dark ? "0 4px 16px rgba(0,0,0,0.2)" : "0 2px 8px rgba(0,0,0,0.06)",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: T.text }}>Progression du jour</span>
          <span style={{ fontSize: 14, fontWeight: 800, color: T.ok }}>{Math.round(progress * 100)}%</span>
        </div>
        <div style={{ height: 10, background: T.border, borderRadius: 999, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${progress * 100}%`, background: `linear-gradient(90deg, ${T.ok}, ${T.ok}cc)`, borderRadius: 999, transition: "width 0.5s ease", boxShadow: `0 0 8px ${T.ok}66` }} />
        </div>
        <div style={{ fontSize: 11, color: T.muted, marginTop: 10 }}>
          Semaine {cfg.week} · Limite : {todayLimit} min/jour · {RHYTHMS[profile.rhythm].emoji} {RHYTHMS[profile.rhythm].label}
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.15); }
        }
      `}</style>
    </div>
  );
}

// ─── TODAY VIEW ───────────────────────────────────────────────────────────────
function TodayView({ sched, nowMin, effEnd, T }) {
  return (
    <div style={{ padding: "16px 16px" }}>
      <div style={{ fontSize: 18, fontWeight: 700, color: T.text, marginBottom: 2 }}>Planning du jour</div>
      <div style={{ fontSize: 13, color: T.muted, marginBottom: 20 }}>Vos fenêtres de vapotage et périodes d'abstention</div>

      {sched.map((s, i) => {
        const end    = effEnd(s);
        const dur    = s.baseDur + s.bonus;
        const isNow  = s.status === "pending" && nowMin >= s.start && nowMin < end;
        const isDone = s.status === "done";
        const isSkip = s.status === "skipped";
        const isMiss = s.status === "pending" && nowMin >= end;

        const col  = isNow ? T.ok : isDone ? T.ok : isSkip ? "#f59e0b" : isMiss ? T.danger : T.muted;
        const bg   = isNow ? T.ok+"18" : isDone ? T.ok+"10" : isSkip ? "#f59e0b14" : isMiss ? T.danger+"10" : T.card;
        const badge = isNow?"EN COURS" : isDone?"TERMINÉ" : isSkip?"REPORTÉ" : isMiss?"MANQUÉ" : "À VENIR";
        const sessionEmoji = isNow?"🟢" : isDone?"✅" : isSkip?"⏭️" : isMiss?"❌" : "⏳";

        return (
          <div key={s.id} style={{ display: "flex", gap: 12, marginBottom: 10, alignItems: "stretch" }}>
            {/* Timeline */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 20, paddingTop: 16 }}>
              <div style={{ width: 14, height: 14, borderRadius: "50%", background: col, flexShrink: 0, boxShadow: isNow ? `0 0 8px ${col}` : "none" }} />
              {i < sched.length - 1 && <div style={{ flex: 1, width: 2, background: T.border, minHeight: 20, marginTop: 4, borderRadius: 1 }} />}
            </div>

            {/* Card */}
            <div style={{
              flex: 1, background: bg, borderRadius: 18, padding: "14px 16px",
              border: isNow ? `2px solid ${T.ok}66` : `1px solid ${T.border}`,
              boxShadow: isNow ? `0 4px 16px ${T.ok}22` : "none",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontWeight: 700, color: T.text, fontSize: 15 }}>
                    {sessionEmoji} {hhmm(s.start)} – {hhmm(end)}
                  </div>
                  <div style={{ fontSize: 12, color: T.muted, marginTop: 3 }}>
                    {dur} min
                    {s.bonus > 0 && <span style={{ color: "#f59e0b", fontWeight: 600 }}> (+{s.bonus} récupérées)</span>}
                  </div>
                </div>
                <div style={{
                  background: col + "25", color: col, borderRadius: 999,
                  padding: "4px 12px", fontSize: 10, fontWeight: 700, flexShrink: 0,
                  letterSpacing: 0.5,
                }}>{badge}</div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── PLAN VIEW ────────────────────────────────────────────────────────────────
function PlanView({ plan, cfg, profile, T }) {
  const r = RHYTHMS[profile.rhythm];
  return (
    <div style={{ padding: "16px 16px" }}>
      <div style={{ fontSize: 18, fontWeight: 700, color: T.text, marginBottom: 4 }}>Programme de réduction</div>
      <div style={{ fontSize: 13, color: T.muted, marginBottom: 12 }}>{r.emoji} {r.label} · {r.desc}</div>

      <div style={{
        background: r.colorHex + "18", border: `1.5px solid ${r.colorHex}44`,
        borderRadius: 16, padding: "14px 16px", marginBottom: 20, fontSize: 13, color: T.text,
      }}>
        Départ : <strong style={{ color: r.colorHex }}>{profile.startMins} min/jour</strong> · Objectif : <strong>0 min</strong> en <strong>{plan.length} semaines</strong>
      </div>

      {plan.map(({ w, mins }) => {
        const isCur = w === cfg.week, isDone = w < cfg.week;
        const pct = Math.round((mins / (plan[0]?.mins || 1)) * 100);
        return (
          <div key={w} style={{
            background: isCur ? T.accent + "18" : isDone ? T.ok + "10" : T.card,
            border: `2px solid ${isCur ? T.accent + "66" : isDone ? T.ok + "33" : T.border}`,
            borderRadius: 18, padding: "14px 16px", marginBottom: 10,
            boxShadow: isCur ? `0 4px 20px ${T.accent}22` : "none",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
              <div style={{
                width: 36, height: 36, borderRadius: "50%",
                background: isDone ? T.ok : isCur ? T.accent : T.border,
                color: isDone || isCur ? "#fff" : T.muted,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: isDone ? 16 : 13, fontWeight: 800, flexShrink: 0,
                boxShadow: isCur ? `0 4px 12px ${T.accent}55` : "none",
              }}>
                {isDone ? "✓" : w}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, color: T.text, fontSize: 14 }}>
                  Semaine {w} {w === plan.length ? "🎉" : ""}
                </div>
                {isCur && <div style={{ fontSize: 11, color: T.accent, fontWeight: 600 }}>← Vous êtes ici</div>}
              </div>
              <div style={{ fontWeight: 800, fontSize: 16, color: mins === 0 ? T.ok : isCur ? T.accent : isDone ? T.ok : T.muted }}>
                {mins === 0 ? "🎉 Libre !" : `${mins} min`}
              </div>
            </div>
            <div style={{ height: 6, background: T.border, borderRadius: 999, overflow: "hidden" }}>
              <div style={{
                height: "100%", width: `${pct}%`, borderRadius: 999,
                background: mins === 0 ? T.ok : isCur ? T.accent : isDone ? T.ok + "99" : T.muted + "44",
                transition: "width 0.4s ease",
              }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── SETTINGS VIEW ────────────────────────────────────────────────────────────
function SettingsView({ editCfg, setEditCfg, cfg, profile, apply, resetAll, themeName, setThemeName, T }) {

  const hasChanges = editCfg.sessions !== cfg.sessions || editCfg.wake !== cfg.wake ||
                     editCfg.sleep !== cfg.sleep     || editCfg.week !== cfg.week;

  const cancel = () => setEditCfg({ ...cfg });

  const set = (k, v) => setEditCfg(p => ({ ...p, [k]: v }));

  // Derived preview values based on editCfg
  const plan         = genPlan(profile.startMins, RHYTHMS[profile.rhythm].pct);
  const previewLimit = plan[editCfg.week - 1]?.mins ?? 0;
  const previewDur   = previewLimit > 0 ? Math.max(1, Math.round(previewLimit / editCfg.sessions)) : 0;
  const daySpan      = editCfg.sleep - editCfg.wake; // hours
  const wakeOk       = editCfg.wake < editCfg.sleep - 2; // at least 2h gap
  const totalWeeks   = plan.length;

  // ── Sub-components ──────────────────────────────────────────────────────────

  const Sec = ({ title, subtitle, children }) => (
    <div style={{
      background: T.card, borderRadius: 20, padding: "18px 18px",
      border: `1px solid ${T.border}`, marginBottom: 14,
      boxShadow: T.dark ? "0 4px 20px rgba(0,0,0,0.25)" : "0 2px 10px rgba(0,0,0,0.06)",
    }}>
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{title}</div>
        {subtitle && <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>{subtitle}</div>}
      </div>
      {children}
    </div>
  );

  // Stepper row: label on left, −/value/+ on right
  const Stepper = ({ label, k, min, max, step = 1, fmt, note }) => {
    const val     = editCfg[k];
    const changed = val !== cfg[k];
    const dec = () => val > min && set(k, val - step);
    const inc = () => val < max && set(k, val + step);
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingBlock: 10, borderBottom: `1px solid ${T.border}` }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: T.text }}>{label}</div>
          {note && <div style={{ fontSize: 11, color: T.muted, marginTop: 1 }}>{note}</div>}
          {changed && (
            <div style={{ fontSize: 10, color: T.accent, fontWeight: 700, marginTop: 2 }}>
              Modifié · était {fmt ? fmt(cfg[k]) : cfg[k]}
            </div>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <button onClick={dec} disabled={val <= min} style={{
            width: 38, height: 38, borderRadius: 12, border: `2px solid ${T.border}`,
            background: T.bg, color: val <= min ? T.muted : T.text,
            fontSize: 22, fontWeight: 700, cursor: val <= min ? "default" : "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1,
            opacity: val <= min ? 0.35 : 1,
          }}>−</button>
          <div style={{
            minWidth: 70, textAlign: "center",
            fontSize: 16, fontWeight: 800,
            color: changed ? T.accent : T.text,
          }}>{fmt ? fmt(val) : val}</div>
          <button onClick={inc} disabled={val >= max} style={{
            width: 38, height: 38, borderRadius: 12, border: `2px solid ${T.border}`,
            background: T.bg, color: val >= max ? T.muted : T.text,
            fontSize: 22, fontWeight: 700, cursor: val >= max ? "default" : "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1,
            opacity: val >= max ? 0.35 : 1,
          }}>+</button>
        </div>
      </div>
    );
  };

  return (
    <div style={{ padding: "16px 16px 8px" }}>

      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: T.text }}>Réglages</div>
        {hasChanges && (
          <button onClick={cancel} style={{
            background: T.danger + "18", color: T.danger, border: `1.5px solid ${T.danger}44`,
            borderRadius: 10, padding: "6px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer",
          }}>Annuler</button>
        )}
      </div>

      {/* ── Profil ── */}
      <Sec title="👤 Profil">
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 16, flexShrink: 0,
            background: `linear-gradient(135deg, ${T.accent}, ${T.accent}88)`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 24, fontWeight: 800, color: "#fff",
            boxShadow: `0 4px 14px ${T.accent}44`,
          }}>
            {profile.name.charAt(0).toUpperCase()}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: T.text }}>{profile.name}</div>
            <div style={{ fontSize: 12, color: T.muted, marginTop: 2 }}>{profile.level}</div>
            <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
              <span style={{ background: RHYTHMS[profile.rhythm].colorHex + "22", color: RHYTHMS[profile.rhythm].colorHex, borderRadius: 999, padding: "3px 10px", fontSize: 11, fontWeight: 700 }}>
                {RHYTHMS[profile.rhythm].emoji} {RHYTHMS[profile.rhythm].label}
              </span>
              <span style={{ background: T.accent + "18", color: T.accent, borderRadius: 999, padding: "3px 10px", fontSize: 11, fontWeight: 700 }}>
                Départ {profile.startMins} min
              </span>
            </div>
          </div>
        </div>
      </Sec>

      {/* ── Thème ── */}
      <Sec title="🎨 Apparence" subtitle="Changement appliqué immédiatement">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
          {Object.entries(THEMES).map(([k, th]) => (
            <button key={k} onClick={() => setThemeName(k)} style={{
              border: `2px solid ${themeName === k ? T.accent : T.border}`,
              borderRadius: 14, padding: "10px 4px",
              background: th.bg, cursor: "pointer",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
              transition: "all 0.15s",
              boxShadow: themeName === k ? `0 4px 12px ${T.accent}44` : "none",
              transform: themeName === k ? "scale(1.04)" : "scale(1)",
            }}>
              <div style={{ width: 28, height: 28, borderRadius: "50%", background: `linear-gradient(135deg,${th.accent},${th.accent}88)`, border: `2px solid ${th.border}` }} />
              <div style={{ fontSize: 9, fontWeight: 700, color: th.text, textAlign: "center", width: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", paddingInline: 2 }}>
                {th.name}
              </div>
              {themeName === k && (
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: T.accent }} />
              )}
            </button>
          ))}
        </div>
      </Sec>

      {/* ── Sessions ── */}
      <Sec title="⏱️ Sessions par jour" subtitle={previewDur > 0 ? `≈ ${previewDur} min par session avec le planning actuel` : "Aucune session cette semaine"}>
        <Stepper k="sessions" label="Nombre de sessions" min={2} max={12} fmt={v => `${v} sessions`} />
      </Sec>

      {/* ── Horaires ── */}
      <Sec title="🌅 Horaires de la journée" subtitle={`Amplitude : ${daySpan}h · ${wakeOk ? `De ${pad2(editCfg.wake)}:00 à ${pad2(editCfg.sleep % 24)}:00` : "⚠️ Horaires invalides"}`}>
        <Stepper k="wake"  label="Réveil"   min={4}  max={editCfg.sleep - 3} fmt={v => `${pad2(v)}:00`}        note="Heure du premier réveil" />
        <Stepper k="sleep" label="Coucher"  min={editCfg.wake + 3} max={26}  fmt={v => `${pad2(v % 24)}:00`} note="Heure du coucher" />
      </Sec>

      {/* ── Semaine ── */}
      <Sec title="📅 Semaine du programme" subtitle={`Programme total : ${totalWeeks} semaine${totalWeeks > 1 ? "s" : ""} · Limite semaine ${editCfg.week} : ${previewLimit} min/jour`}>
        <Stepper k="week" label="Semaine actuelle" min={1} max={totalWeeks} fmt={v => `Semaine ${v} / ${totalWeeks}`} note={previewLimit === 0 ? "🎉 Programme terminé !" : `Objectif : ${previewLimit} min/jour`} />
        {/* Mini week progress bar */}
        <div style={{ marginTop: 14 }}>
          <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
            {plan.map(({ w }) => (
              <div key={w} style={{
                flex: "1 0 auto", maxWidth: 20, height: 6, borderRadius: 3,
                background: w < editCfg.week ? T.ok : w === editCfg.week ? T.accent : T.border,
                transition: "background 0.2s",
              }} />
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: T.muted, marginTop: 4 }}>
            <span>Sem. 1</span>
            <span style={{ color: T.ok, fontWeight: 700 }}>{editCfg.week - 1} terminée{editCfg.week > 2 ? "s" : ""}</span>
            <span>Sem. {totalWeeks}</span>
          </div>
        </div>
      </Sec>

      {/* ── Prévisualisation de l'impact ── */}
      {hasChanges && (
        <div style={{
          background: T.accent + "14", border: `1.5px solid ${T.accent}44`,
          borderRadius: 16, padding: "14px 16px", marginBottom: 14,
        }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: T.accent, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>
            Aperçu des modifications
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {[
              { l: "Sessions/jour", v: `${editCfg.sessions}x`, changed: editCfg.sessions !== cfg.sessions },
              { l: "Durée/session", v: previewDur > 0 ? `~${previewDur} min` : "—", changed: editCfg.sessions !== cfg.sessions || editCfg.week !== cfg.week },
              { l: "Réveil",        v: `${pad2(editCfg.wake)}:00`, changed: editCfg.wake !== cfg.wake },
              { l: "Coucher",       v: `${pad2(editCfg.sleep % 24)}:00`, changed: editCfg.sleep !== cfg.sleep },
              { l: "Semaine",       v: `${editCfg.week} / ${totalWeeks}`, changed: editCfg.week !== cfg.week },
              { l: "Limite/jour",   v: `${previewLimit} min`, changed: editCfg.week !== cfg.week },
            ].map(({ l, v, changed }) => (
              <div key={l} style={{ background: changed ? T.accent + "18" : T.bg, borderRadius: 10, padding: "8px 10px", border: `1px solid ${changed ? T.accent + "44" : T.border}` }}>
                <div style={{ fontSize: 10, color: T.muted }}>{l}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: changed ? T.accent : T.text, marginTop: 2 }}>{v}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Actions ── */}
      <button onClick={apply} disabled={!hasChanges || !wakeOk} style={{
        background: (hasChanges && wakeOk) ? T.accent : T.border,
        color: (hasChanges && wakeOk) ? T.accentText : T.muted,
        border: "none", borderRadius: 16, padding: "16px 24px", fontSize: 16, fontWeight: 700,
        width: "100%", cursor: (hasChanges && wakeOk) ? "pointer" : "not-allowed",
        marginBottom: 10,
        boxShadow: (hasChanges && wakeOk) ? `0 4px 20px ${T.accent}55` : "none",
        transition: "all 0.2s",
      }}>
        {hasChanges ? "✅ Enregistrer les réglages" : "✅ Aucune modification"}
      </button>

      {hasChanges && (
        <button onClick={cancel} style={{
          background: "transparent", color: T.muted,
          border: `2px solid ${T.border}`, borderRadius: 16,
          padding: "13px 24px", fontSize: 14, fontWeight: 600,
          width: "100%", cursor: "pointer", marginBottom: 10,
          transition: "all 0.15s",
        }}>
          ↩ Annuler les modifications
        </button>
      )}

      <button onClick={resetAll} style={{
        background: "transparent", color: T.danger,
        border: `2px solid ${T.danger}33`, borderRadius: 16,
        padding: "13px 24px", fontSize: 14, fontWeight: 600,
        width: "100%", cursor: "pointer",
      }}>
        🔄 Recommencer l'évaluation
      </button>

      <div style={{ height: 8 }} />
    </div>
  );
}
