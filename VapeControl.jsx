import { useState, useEffect, useRef, useCallback } from "react";

// ─── THEMES (5 dark, 3 light) ─────────────────────────────────────────────────
const THEMES = {
  midnight: { name:"Midnight",   dark:true,  bg:"#0d0d1a", card:"#16162e", border:"#2d2d55", text:"#e2e8f0", muted:"#6b7280", accent:"#818cf8", accentText:"#ffffff", ok:"#34d399", danger:"#f87171" },
  carbon:   { name:"Carbon",     dark:true,  bg:"#0a0a0a", card:"#1a1a1a", border:"#2e2e2e", text:"#e5e5e5", muted:"#737373", accent:"#f59e0b", accentText:"#000000", ok:"#34d399", danger:"#f87171" },
  forest:   { name:"Forêt",      dark:true,  bg:"#071a0f", card:"#0d2418", border:"#1a3d25", text:"#d1fae5", muted:"#6b7280", accent:"#34d399", accentText:"#000000", ok:"#34d399", danger:"#f87171" },
  ocean:    { name:"Océan Nuit", dark:true,  bg:"#050f1e", card:"#0a1e38", border:"#1a3558", text:"#bfdbfe", muted:"#64748b", accent:"#38bdf8", accentText:"#000000", ok:"#34d399", danger:"#f87171" },
  crimson:  { name:"Crimson",    dark:true,  bg:"#120408", card:"#200812", border:"#40101e", text:"#fecdd3", muted:"#9f1239", accent:"#fb7185", accentText:"#000000", ok:"#34d399", danger:"#f87171" },
  snow:     { name:"Blanc Pur",  dark:false, bg:"#f8fafc", card:"#ffffff", border:"#e2e8f0", text:"#1e293b", muted:"#94a3b8", accent:"#3b82f6", accentText:"#ffffff", ok:"#10b981", danger:"#ef4444" },
  sky:      { name:"Ciel",       dark:false, bg:"#eff6ff", card:"#ffffff", border:"#bfdbfe", text:"#1e3a5f", muted:"#64748b", accent:"#2563eb", accentText:"#ffffff", ok:"#10b981", danger:"#ef4444" },
  mint:     { name:"Menthe",     dark:false, bg:"#f0fdf4", card:"#ffffff", border:"#bbf7d0", text:"#14532d", muted:"#6b7280", accent:"#059669", accentText:"#ffffff", ok:"#059669", danger:"#ef4444" },
};

// ─── RHYTHMS ──────────────────────────────────────────────────────────────────
const RHYTHMS = {
  progressif: { label:"Progressif", emoji:"🌱", pct:8,  colorHex:"#10b981", desc:"−8 % par semaine", detail:"Idéal pour une dépendance faible. Réduction douce et durable." },
  modere:     { label:"Modéré",     emoji:"⚡", pct:15, colorHex:"#3b82f6", desc:"−15 % par semaine", detail:"Bon équilibre entre confort et efficacité." },
  rapide:     { label:"Rapide",     emoji:"🚀", pct:25, colorHex:"#ef4444", desc:"−25 % par semaine", detail:"Pour ceux qui veulent arrêter rapidement et ont une forte motivation." },
};

// ─── MOTIVATIONAL MESSAGES ────────────────────────────────────────────────────
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

// ─── UTILS ────────────────────────────────────────────────────────────────────
const pad2    = n  => String(Math.max(0, Math.floor(n))).padStart(2, "0");
const hms     = s  => { if (s <= 0) return "00:00"; const h=Math.floor(s/3600),m=Math.floor((s%3600)/60),sec=s%60; return h>0?`${pad2(h)}:${pad2(m)}:${pad2(sec)}`:`${pad2(m)}:${pad2(sec)}`; };
const hhmm    = m  => `${pad2(Math.floor(m/60)%24)}:${pad2(m%60)}`;
const getNow  = () => { const d=new Date(); return d.getHours()*3600+d.getMinutes()*60+d.getSeconds(); };

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
  if (ans.freq === "lt5")   { sc += 0; startMins = 35; }
  if (ans.freq === "5to15") { sc += 1; startMins = 60; }
  if (ans.freq === "15to30"){ sc += 2; startMins = 90; }
  if (ans.freq === "gt30")  { sc += 3; startMins = 120; }
  if (ans.morning === "yes") sc += 2;
  sc += { never:0, sometimes:1, often:2, always:3 }[ans.anxiety] || 0;
  sc += { lt6m:0, s6m2y:1, s2to5:2, gt5:3 }[ans.duration] || 0;
  const recommended = sc <= 3 ? "progressif" : sc <= 7 ? "modere" : "rapide";
  const level = sc <= 3 ? "Faible dépendance" : sc <= 7 ? "Dépendance modérée" : "Forte dépendance";
  return { sc, recommended, level, startMins };
};

// ─── ONBOARDING ───────────────────────────────────────────────────────────────
function Onboarding({ onComplete, T }) {
  const [step, setStep]           = useState(0);
  const [name, setName]           = useState("");
  const [ans, setAns]             = useState({});
  const [result, setResult]       = useState(null);
  const [rhythm, setRhythm]       = useState(null);
  const [sessions, setSessions]   = useState(6);

  const QUESTIONS = [
    { key:"freq",     q:"Combien de fois vapotez-vous par jour ?", opts:[
      { v:"lt5",    l:"Moins de 5 fois",  s:"Usage très léger" },
      { v:"5to15",  l:"5 à 15 fois",      s:"Usage modéré" },
      { v:"15to30", l:"15 à 30 fois",     s:"Usage intensif" },
      { v:"gt30",   l:"Plus de 30 fois",  s:"Usage très intensif" },
    ]},
    { key:"morning",  q:"Vapotez-vous dans les 30 min après le réveil ?", opts:[
      { v:"no",  l:"Non",  s:"Je peux attendre sans problème" },
      { v:"yes", l:"Oui",  s:"C'est souvent mon premier réflexe" },
    ]},
    { key:"anxiety",  q:"Comment vous sentez-vous sans pouvoir vapoter ?", opts:[
      { v:"never",     l:"Serein(e)",      s:"Aucune anxiété particulière" },
      { v:"sometimes", l:"Légèrement gêné(e)", s:"Un peu distrait(e)" },
      { v:"often",     l:"Anxieux(se)",    s:"Difficile de me concentrer" },
      { v:"always",    l:"Très irritable", s:"Je pense à ça constamment" },
    ]},
    { key:"duration",  q:"Depuis combien de temps vapotez-vous ?", opts:[
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

  const st = { // shared styles
    wrap: { minHeight:"100vh", background:T.bg, display:"flex", alignItems:"center", justifyContent:"center", padding:"20px 16px" },
    card: { background:T.card, borderRadius:24, padding:"30px 24px", maxWidth:400, width:"100%", boxShadow: T.dark ? "0 8px 40px rgba(0,0,0,0.5)" : "0 4px 24px rgba(0,0,0,0.1)" },
    h1:   { fontSize:21, fontWeight:800, color:T.text, textAlign:"center", marginBottom:6 },
    sub:  { fontSize:13, color:T.muted, textAlign:"center", marginBottom:24, lineHeight:1.6 },
    optBtn: (sel, col) => ({ display:"block", width:"100%", textAlign:"left", background: sel ? (col||T.accent)+"22" : T.bg, border:`2px solid ${sel ? (col||T.accent) : T.border}`, borderRadius:14, padding:"14px 16px", marginBottom:10, cursor:"pointer", transition:"all 0.15s" }),
    inp:  { width:"100%", background:T.bg, border:`2px solid ${T.border}`, borderRadius:12, padding:"14px 16px", fontSize:16, color:T.text, outline:"none", boxSizing:"border-box" },
    btn:  (col) => ({ background:col||T.accent, color:T.accentText, border:"none", borderRadius:14, padding:"15px 24px", fontSize:16, fontWeight:700, width:"100%", cursor:"pointer", marginTop:12 }),
  };

  // Step 0 — Name
  if (step === 0) return (
    <div style={st.wrap}><div style={st.card}>
      <div style={{ fontSize:52, textAlign:"center", marginBottom:12 }}>💨</div>
      <div style={st.h1}>VapeControl</div>
      <div style={st.sub}>Votre programme personnalisé pour réduire progressivement la cigarette électronique.</div>
      <label style={{ fontSize:13, fontWeight:600, color:T.text, display:"block", marginBottom:8 }}>Votre prénom</label>
      <input style={st.inp} placeholder="Ex : Marie" value={name} autoFocus
        onChange={e => setName(e.target.value)}
        onKeyDown={e => e.key === "Enter" && name.trim() && setStep(1)} />
      <button style={{ ...st.btn(), opacity: name.trim() ? 1 : 0.45 }} onClick={() => name.trim() && setStep(1)}>
        Commencer l'évaluation →
      </button>
    </div></div>
  );

  // Steps 1-4 — Questions
  const qi = step - 1;
  if (qi >= 0 && qi < QUESTIONS.length) {
    const Q = QUESTIONS[qi];
    return (
      <div style={st.wrap}><div style={st.card}>
        {/* dots */}
        <div style={{ display:"flex", gap:6, justifyContent:"center", marginBottom:22 }}>
          {QUESTIONS.map((_,i) => <div key={i} style={{ width: i===qi?20:8, height:8, borderRadius:4, background: i<=qi ? T.accent : T.border, transition:"all 0.3s" }} />)}
        </div>
        <div style={st.h1}>{Q.q}</div>
        <div style={{ marginTop:18 }}>
          {Q.opts.map(o => (
            <button key={o.v} style={st.optBtn(ans[Q.key]===o.v)} onClick={() => pick(Q.key, o.v)}>
              <div style={{ fontSize:15, fontWeight:700, color:T.text }}>{o.l}</div>
              <div style={{ fontSize:12, color:T.muted, marginTop:2 }}>{o.s}</div>
            </button>
          ))}
        </div>
        <div style={{ fontSize:12, color:T.muted, textAlign:"center", marginTop:8 }}>Bonjour {name} · Question {qi+1}/{QUESTIONS.length}</div>
      </div></div>
    );
  }

  // Result + rhythm choice
  if (result) return (
    <div style={st.wrap}><div style={st.card}>
      <div style={{ fontSize:44, textAlign:"center", marginBottom:8 }}>📊</div>
      <div style={st.h1}>Votre profil, {name}</div>

      <div style={{ background:T.accent+"22", border:`2px solid ${T.accent}55`, borderRadius:14, padding:16, marginBottom:20, textAlign:"center" }}>
        <div style={{ fontSize:12, color:T.muted, marginBottom:4 }}>Niveau de dépendance estimé</div>
        <div style={{ fontSize:18, fontWeight:800, color:T.text }}>{result.level}</div>
        <div style={{ fontSize:12, color:T.muted, marginTop:4 }}>Limite de départ : <strong style={{ color:T.text }}>{result.startMins} min/jour</strong></div>
      </div>

      <div style={{ fontSize:14, fontWeight:700, color:T.text, marginBottom:10 }}>Choisissez votre rythme de réduction :</div>
      {Object.entries(RHYTHMS).map(([k, r]) => {
        const sel = rhythm === k, isRec = result.recommended === k;
        return (
          <button key={k} style={st.optBtn(sel, r.colorHex)} onClick={() => setRhythm(k)}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
              <div>
                <div style={{ fontSize:15, fontWeight:700, color:T.text }}>{r.emoji} {r.label} <span style={{ fontSize:13, color:T.muted, fontWeight:400 }}>· {r.desc}</span></div>
                <div style={{ fontSize:12, color:T.muted, marginTop:3 }}>{r.detail}</div>
              </div>
              {isRec && <div style={{ background:r.colorHex, color:"#fff", borderRadius:999, padding:"3px 10px", fontSize:10, fontWeight:700, flexShrink:0, marginLeft:8 }}>Recommandé</div>}
            </div>
          </button>
        );
      })}

      <div style={{ marginTop:18, marginBottom:6 }}>
        <div style={{ fontSize:13, fontWeight:600, color:T.text, marginBottom:8 }}>Sessions de vapotage par jour</div>
        <div style={{ display:"flex", gap:6 }}>
          {[3,4,5,6,8,10].map(n => (
            <button key={n} onClick={() => setSessions(n)} style={{ flex:1, padding:"10px 0", borderRadius:10, border:`2px solid ${sessions===n ? T.accent : T.border}`, background: sessions===n ? T.accent+"22" : T.bg, color:T.text, fontWeight:700, cursor:"pointer", fontSize:14 }}>{n}</button>
          ))}
        </div>
      </div>

      <button style={st.btn(RHYTHMS[rhythm||"modere"].colorHex)} onClick={() => rhythm && onComplete({ name, rhythm, startMins: result.startMins, sessions, week:1, level: result.level })}>
        🚀 Démarrer mon programme
      </button>
    </div></div>
  );

  return null;
}

// ─── ROOT ─────────────────────────────────────────────────────────────────────
export default function VapeControl() {
  const [profile,   setProfile]   = useState(null);
  const [cfg,       setCfg]       = useState({ sessions:6, wake:7, sleep:23, week:1 });
  const [sched,     setSched]     = useState([]);
  const [nowSec,    setNowSec]    = useState(getNow());
  const [tab,       setTab]       = useState("home");
  const [notifOn,   setNotifOn]   = useState(false);
  const [themeName, setThemeName] = useState("midnight");
  const [editCfg,   setEditCfg]   = useState(cfg);
  const notifSent = useRef(new Set());
  const T = THEMES[themeName];

  useEffect(() => { const id = setInterval(() => setNowSec(getNow()), 1000); return () => clearInterval(id); }, []);
  useEffect(() => { if ("Notification" in window && Notification.permission === "granted") setNotifOn(true); }, []);

  const push = useCallback((title, body) => {
    if (notifOn && "Notification" in window) try { new Notification(title, { body }); } catch {}
  }, [notifOn]);

  const askNotif = async () => {
    if (!("Notification" in window)) return;
    const p = await Notification.requestPermission(); setNotifOn(p === "granted");
  };

  // Recompute schedule whenever profile or cfg changes
  useEffect(() => {
    if (!profile) return;
    const plan = genPlan(profile.startMins, RHYTHMS[profile.rhythm].pct);
    const limit = plan[cfg.week - 1]?.mins ?? 0;
    setSched(buildSchedule({ limit, sessions: cfg.sessions, wake: cfg.wake, sleep: cfg.sleep }));
    notifSent.current.clear();
  }, [profile, cfg]);

  const effEnd = s => s.start + s.baseDur + s.bonus;
  const nowMin = Math.floor(nowSec / 60);

  const curSess  = sched.find(s => s.status === "pending" && nowMin >= s.start && nowMin < effEnd(s));
  const nextSess = sched.find(s => s.status === "pending" && s.start > nowMin);
  const isVaping   = !!curSess;
  const secsLeft   = curSess  ? Math.max(0, effEnd(curSess)  * 60 - nowSec) : 0;
  const secsToNext = nextSess ? Math.max(0, nextSess.start   * 60 - nowSec) : 0;

  // Session transitions + motivational alerts
  useEffect(() => {
    if (!profile) return;
    const msgs = MOTIV(profile.name);
    const rnd = () => msgs[Math.floor(Math.random() * msgs.length)];

    sched.forEach(s => {
      if (s.status !== "pending") return;
      const end = effEnd(s);

      // Session start
      const kS = `S${s.id}`;
      if (nowMin === s.start && !notifSent.current.has(kS)) {
        notifSent.current.add(kS);
        push("🟢 À vous de jouer !", `Session de ${s.baseDur + s.bonus} min autorisée. Profitez-en !`);
      }
      // 1-min warning
      const kW = `W${s.id}`;
      if (nowMin === end - 1 && !notifSent.current.has(kW)) {
        notifSent.current.add(kW);
        push("⚠️ 1 minute restante", "Terminez bientôt votre session.");
      }
      // Session end
      const kE = `E${s.id}`;
      if (nowMin >= end && !notifSent.current.has(kE)) {
        notifSent.current.add(kE);
        push("🔴 Session terminée", nextSess ? `Prochaine session à ${hhmm(nextSess.start)} — tenez bon !` : "Journée terminée ! Bravo 🎉");
        setSched(p => p.map(x => x.id === s.id ? { ...x, status:"done" } : x));
      }
    });

    // Motivational notifications during abstinence (not in a vaping window)
    if (!isVaping && nextSess) {
      const abstDur  = nextSess.start * 60 - (curSess ? effEnd(curSess) * 60 : nowSec);
      const halfway  = nextSess.start * 60 - Math.round(abstDur / 2);
      const fifteenB = nextSess.start * 60 - 15 * 60;

      const kMH = `MH${nextSess.id}`;
      if (nowSec >= halfway && nowSec < halfway + 60 && !notifSent.current.has(kMH)) {
        notifSent.current.add(kMH);
        push("✨ Motiviation", rnd());
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
    const rec = Math.round(dur * (1 - 25 / 100));
    const futIds = sched.filter(s => s.status === "pending" && s.id !== curSess.id && s.start > nowMin).map(s => s.id);
    const bonus = futIds.length > 0 ? Math.floor(rec / futIds.length) : 0;
    setSched(p => p.map(s => {
      if (s.id === curSess.id) return { ...s, status:"skipped" };
      if (futIds.includes(s.id)) return { ...s, bonus: s.bonus + bonus };
      return s;
    }));
    push("⏭️ Session reportée", futIds.length > 0 ? `+${bonus} min redistribuées. ${MOTIV(profile.name)[4]}` : "Aucune session restante aujourd'hui.");
  };

  const applySettings = () => {
    setCfg(editCfg);
    setTab("home");
  };

  const plan = profile ? genPlan(profile.startMins, RHYTHMS[profile.rhythm].pct) : [];
  const todayLimit = plan[cfg.week - 1]?.mins ?? 0;
  const statDone    = sched.filter(s => s.status === "done").length;
  const statSkipped = sched.filter(s => s.status === "skipped").length;
  const vapedMins   = sched.filter(s => s.status === "done").reduce((a, s) => a + s.baseDur + s.bonus, 0);
  const dayDone = !isVaping && secsToNext === 0 && sched.length > 0;

  if (!profile) return <Onboarding T={T} onComplete={p => { setProfile(p); setCfg(c => ({ ...c, sessions: p.sessions })); setEditCfg(c => ({ ...c, sessions: p.sessions })); }} />;

  const NAV = [
    { id:"home",     icon:"🏠", label:"Accueil"     },
    { id:"today",    icon:"📅", label:"Aujourd'hui" },
    { id:"plan",     icon:"📈", label:"Programme"   },
    { id:"settings", icon:"⚙️", label:"Réglages"   },
  ];

  return (
    <div style={{ fontFamily:"system-ui,sans-serif", maxWidth:430, margin:"0 auto", minHeight:"100vh", display:"flex", flexDirection:"column", background:T.bg }}>

      {/* Header */}
      <div style={{
        background: isVaping
          ? `linear-gradient(135deg,${T.ok}cc,${T.ok}88)`
          : `linear-gradient(135deg,${T.accent}cc,${T.accent}88)`,
        color:"white", padding:"16px 20px 14px", textAlign:"center",
        boxShadow: T.dark ? "0 2px 12px rgba(0,0,0,0.4)" : "0 2px 8px rgba(0,0,0,0.12)"
      }}>
        <div style={{ fontSize:11, opacity:0.8, marginBottom:2 }}>
          Bonjour {profile.name} · Semaine {cfg.week} · {RHYTHMS[profile.rhythm].emoji} {RHYTHMS[profile.rhythm].label}
        </div>
        <div style={{ fontSize:20, fontWeight:800, letterSpacing:"-0.4px" }}>💨 VapeControl</div>
      </div>

      {/* Content */}
      <div style={{ flex:1, overflowY:"auto", paddingBottom:76 }}>
        {tab==="home"     && <HomeView     {...{isVaping,secsLeft,secsToNext,curSess,nextSess,sched,statDone,statSkipped,vapedMins,todayLimit,cfg,profile,plan,dayDone,skipSession,notifOn,askNotif,effEnd,T}} />}
        {tab==="today"    && <TodayView    {...{sched,nowMin,effEnd,T}} />}
        {tab==="plan"     && <PlanView     {...{plan,cfg,profile,T}} />}
        {tab==="settings" && <SettingsView {...{editCfg,setEditCfg,apply:applySettings,profile,setProfile,themeName,setThemeName,T}} />}
      </div>

      {/* Bottom Nav */}
      <div style={{ position:"fixed", bottom:0, left:"50%", transform:"translateX(-50%)", width:"100%", maxWidth:430, background:T.card, borderTop:`1px solid ${T.border}`, display:"flex", boxShadow:"0 -2px 12px rgba(0,0,0,0.2)" }}>
        {NAV.map(({ id, icon, label }) => (
          <button key={id} onClick={() => setTab(id)} style={{ flex:1, padding:"10px 0 8px", border:"none", background:"transparent", color: tab===id ? T.accent : T.muted, cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", gap:3, borderTop: tab===id ? `2px solid ${T.accent}` : "2px solid transparent" }}>
            <span style={{ fontSize:21 }}>{icon}</span>
            <span style={{ fontSize:10, fontWeight: tab===id ? 700 : 400 }}>{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── HOME VIEW ────────────────────────────────────────────────────────────────
function HomeView({ isVaping, secsLeft, secsToNext, curSess, nextSess, sched, statDone, statSkipped, vapedMins, todayLimit, cfg, profile, plan, dayDone, skipSession, notifOn, askNotif, effEnd, T }) {
  const progress = cfg.sessions > 0 ? statDone / cfg.sessions : 0;
  const sessIdx  = curSess ? sched.findIndex(s => s === curSess) + 1 : 0;

  return (
    <div style={{ padding:"12px 16px" }}>

      {/* Notification banner */}
      {!notifOn && (
        <div style={{ background:T.accent+"18", border:`1px solid ${T.accent}44`, borderRadius:12, padding:"12px 16px", marginBottom:12, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div>
            <div style={{ fontSize:13, fontWeight:600, color:T.text }}>🔔 Activez les notifications</div>
            <div style={{ fontSize:12, color:T.muted, marginTop:1 }}>Pour les alertes et messages de motivation</div>
          </div>
          <button onClick={askNotif} style={{ background:T.accent, color:T.accentText, border:"none", borderRadius:8, padding:"7px 13px", fontSize:12, fontWeight:700, cursor:"pointer", flexShrink:0 }}>Activer</button>
        </div>
      )}

      {/* Main status card */}
      <div style={{
        background: isVaping ? T.ok+"18" : dayDone ? T.ok+"18" : T.danger+"12",
        border: `2px solid ${isVaping ? T.ok+"55" : dayDone ? T.ok+"55" : T.danger+"44"}`,
        borderRadius:22, padding:"26px 20px", textAlign:"center", marginBottom:12
      }}>
        {/* Badge */}
        <div style={{ display:"inline-flex", alignItems:"center", gap:8, background: isVaping ? T.ok+"25" : dayDone ? T.ok+"25" : T.danger+"25", color: isVaping||dayDone ? T.ok : T.danger, borderRadius:999, padding:"6px 16px", fontWeight:700, fontSize:13, marginBottom:18, border:`1.5px solid ${isVaping||dayDone ? T.ok+"55" : T.danger+"44"}` }}>
          <span style={{ display:"inline-block", width:8, height:8, borderRadius:"50%", background: isVaping||dayDone ? T.ok : T.danger, boxShadow: isVaping ? `0 0 6px ${T.ok}` : "" }} />
          {isVaping ? "🟢 VAPOTAGE AUTORISÉ" : dayDone ? "✅ JOURNÉE TERMINÉE" : "🔴 PÉRIODE D'ABSTENTION"}
        </div>

        {isVaping ? (<>
          <div style={{ fontSize:12, color:T.muted, marginBottom:4 }}>Temps restant — session {sessIdx}/{cfg.sessions}</div>
          <div style={{ fontSize:72, fontWeight:800, color:T.ok, fontFamily:"monospace", lineHeight:1, marginBottom:8 }}>{hms(secsLeft)}</div>
          <div style={{ fontSize:13, color:T.muted }}>Durée totale : {curSess.baseDur + curSess.bonus} min{nextSess ? ` · Prochaine à ${hhmm(nextSess.start)}` : ""}</div>
        </>) : secsToNext > 0 ? (<>
          <div style={{ fontSize:12, color:T.muted, marginBottom:4 }}>Prochaine session dans</div>
          <div style={{ fontSize:72, fontWeight:800, color:T.danger, fontFamily:"monospace", lineHeight:1, marginBottom:8 }}>{hms(secsToNext)}</div>
          {nextSess && <div style={{ fontSize:13, color:T.muted }}>À {hhmm(nextSess.start)} · Durée : {nextSess.baseDur + nextSess.bonus} min</div>}
          {/* Motivational tip */}
          <div style={{ marginTop:14, background:T.accent+"15", borderRadius:12, padding:"10px 14px" }}>
            <div style={{ fontSize:13, color:T.text, fontStyle:"italic" }}>{MOTIV(profile.name)[Math.floor(Date.now() / 60000) % MOTIV(profile.name).length]}</div>
          </div>
        </>) : (<>
          <div style={{ fontSize:48, marginBottom:8 }}>🎉</div>
          <div style={{ fontSize:20, fontWeight:800, color:T.text }}>Journée terminée !</div>
          <div style={{ fontSize:13, color:T.muted, marginTop:6 }}>{vapedMins} min vapotées · Limite : {todayLimit} min</div>
          {vapedMins < todayLimit && <div style={{ fontSize:13, color:T.ok, marginTop:6, fontWeight:700 }}>💪 {todayLimit - vapedMins} min économisées !</div>}
        </>)}
      </div>

      {/* Skip button */}
      {isVaping && (
        <div style={{ marginBottom:12 }}>
          <button onClick={skipSession} style={{ background:T.card, color:T.accent, border:`2px solid ${T.accent}55`, borderRadius:14, padding:"14px 20px", fontSize:15, fontWeight:700, width:"100%", cursor:"pointer", boxShadow: T.dark ? "0 2px 8px rgba(0,0,0,0.3)" : "0 1px 4px rgba(0,0,0,0.08)" }}>
            ⏭️ Je ne peux pas vapoter maintenant
          </button>
          <div style={{ textAlign:"center", fontSize:12, color:T.muted, marginTop:5 }}>Le temps sera redistribué sur les sessions suivantes (pénalité : 25%)</div>
        </div>
      )}

      {/* Stats */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, marginBottom:12 }}>
        {[
          { l:"Sessions",  v:`${statDone}/${cfg.sessions}`, icon:"✅" },
          { l:"Vapotées",  v:`${vapedMins} min`,            icon:"💨" },
          { l:"Reportées", v:statSkipped,                   icon:"⏭️" },
        ].map(({ l, v, icon }) => (
          <div key={l} style={{ background:T.card, borderRadius:14, padding:"14px 8px", textAlign:"center", boxShadow: T.dark ? "0 2px 8px rgba(0,0,0,0.3)" : "0 1px 4px rgba(0,0,0,0.07)", border:`1px solid ${T.border}` }}>
            <div style={{ fontSize:21 }}>{icon}</div>
            <div style={{ fontSize:17, fontWeight:800, color:T.text, marginTop:2 }}>{v}</div>
            <div style={{ fontSize:11, color:T.muted, marginTop:2 }}>{l}</div>
          </div>
        ))}
      </div>

      {/* Day progress */}
      <div style={{ background:T.card, borderRadius:14, padding:16, border:`1px solid ${T.border}` }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
          <span style={{ fontSize:14, fontWeight:600, color:T.text }}>Progression du jour</span>
          <span style={{ fontSize:13, fontWeight:700, color:T.accent }}>{Math.round(progress * 100)}%</span>
        </div>
        <div style={{ height:8, background:T.border, borderRadius:999, overflow:"hidden" }}>
          <div style={{ height:"100%", width:`${progress * 100}%`, background:T.ok, borderRadius:999, transition:"width 0.5s ease" }} />
        </div>
        <div style={{ fontSize:12, color:T.muted, marginTop:8 }}>
          Semaine {cfg.week} · Limite : {todayLimit} min/jour · {RHYTHMS[profile.rhythm].emoji} {RHYTHMS[profile.rhythm].label}
        </div>
      </div>
    </div>
  );
}

// ─── TODAY VIEW ───────────────────────────────────────────────────────────────
function TodayView({ sched, nowMin, effEnd, T }) {
  return (
    <div style={{ padding:"12px 16px" }}>
      <div style={{ fontSize:16, fontWeight:700, color:T.text, marginBottom:4 }}>Planning du jour</div>
      <div style={{ fontSize:13, color:T.muted, marginBottom:16 }}>Vos fenêtres de vapotage et périodes d'abstention</div>

      {sched.map((s, i) => {
        const end   = effEnd(s);
        const dur   = s.baseDur + s.bonus;
        const isNow = s.status === "pending" && nowMin >= s.start && nowMin < end;
        const isDone = s.status === "done", isSkip = s.status === "skipped";
        const isMiss = s.status === "pending" && nowMin >= end;

        const col = isNow ? T.ok : isDone ? T.ok : isSkip ? "#f59e0b" : isMiss ? T.danger : T.muted;
        const bg  = isNow ? T.ok+"18" : isDone ? T.ok+"10" : isSkip ? "#f59e0b18" : isMiss ? T.danger+"10" : T.card;
        const icon = isNow?"🟢" : isDone?"✅" : isSkip?"⏭️" : isMiss?"❌" : "⏳";
        const badge = isNow?"EN COURS" : isDone?"TERMINÉ" : isSkip?"REPORTÉ" : isMiss?"MANQUÉ" : "À VENIR";

        return (
          <div key={s.id} style={{ display:"flex", gap:10, marginBottom:8, alignItems:"stretch" }}>
            <div style={{ display:"flex", flexDirection:"column", alignItems:"center", width:18 }}>
              <div style={{ width:12, height:12, borderRadius:"50%", background:col, flexShrink:0, marginTop:14 }} />
              {i < sched.length - 1 && <div style={{ flex:1, width:2, background:T.border, minHeight:16, marginTop:2 }} />}
            </div>
            <div style={{ flex:1, background:bg, borderRadius:14, padding:"12px 14px", border: isNow ? `2px solid ${T.ok}55` : `1px solid ${T.border}` }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                <div>
                  <div style={{ fontWeight:700, color:T.text, fontSize:15 }}>{icon} {hhmm(s.start)} – {hhmm(end)}</div>
                  <div style={{ fontSize:13, color:T.muted, marginTop:2 }}>{dur} min{s.bonus > 0 ? <span style={{ color:"#f59e0b" }}> (+{s.bonus} récupérées)</span> : ""}</div>
                </div>
                <div style={{ background:col+"25", color:col, borderRadius:999, padding:"3px 10px", fontSize:10, fontWeight:700, flexShrink:0 }}>{badge}</div>
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
    <div style={{ padding:"12px 16px" }}>
      <div style={{ fontSize:16, fontWeight:700, color:T.text, marginBottom:2 }}>Programme de réduction</div>
      <div style={{ fontSize:13, color:T.muted, marginBottom:6 }}>{r.emoji} {r.label} · {r.desc}</div>
      <div style={{ background:r.colorHex+"18", border:`1px solid ${r.colorHex}44`, borderRadius:12, padding:"10px 14px", marginBottom:16, fontSize:13, color:T.text }}>
        Départ : <strong>{profile.startMins} min/jour</strong> · Objectif : <strong>0 min</strong> en <strong>{plan.length} semaines</strong>
      </div>

      {plan.map(({ w, mins }) => {
        const isCur = w === cfg.week, isDone = w < cfg.week;
        const pct = Math.round((mins / plan[0].mins) * 100);
        return (
          <div key={w} style={{ background: isCur ? T.accent+"18" : isDone ? T.ok+"10" : T.card, border:`2px solid ${isCur ? T.accent+"55" : isDone ? T.ok+"33" : T.border}`, borderRadius:14, padding:"12px 16px", marginBottom:8 }}>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:6 }}>
              <div style={{ width:28, height:28, borderRadius:"50%", background: isDone ? T.ok : isCur ? T.accent : T.border, color: isDone||isCur ? T.accentText : T.muted, display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:800, flexShrink:0 }}>
                {isDone ? "✓" : w}
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:700, color:T.text, fontSize:14 }}>Semaine {w} {w === plan.length ? "🎉" : ""}</div>
                {isCur && <div style={{ fontSize:11, color:T.accent, fontWeight:600 }}>← Vous êtes ici</div>}
              </div>
              <div style={{ fontWeight:800, fontSize:16, color: mins===0 ? T.ok : isCur ? T.accent : isDone ? T.ok : T.muted }}>
                {mins === 0 ? "🎉 Libre !" : `${mins} min`}
              </div>
            </div>
            <div style={{ height:5, background:T.border, borderRadius:999, overflow:"hidden" }}>
              <div style={{ height:"100%", width:`${pct}%`, background: mins===0 ? T.ok : isCur ? T.accent : isDone ? T.ok+"99" : T.muted+"44", borderRadius:999 }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── SETTINGS VIEW ────────────────────────────────────────────────────────────
function SettingsView({ editCfg, setEditCfg, apply, profile, setProfile, themeName, setThemeName, T }) {
  const Slider = ({ label, k, min, max, step=1, fmt }) => (
    <div style={{ marginBottom:18 }}>
      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
        <label style={{ fontSize:14, fontWeight:600, color:T.text }}>{label}</label>
        <span style={{ fontSize:14, fontWeight:700, color:T.accent }}>{fmt ? fmt(editCfg[k]) : editCfg[k]}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={editCfg[k]}
        onChange={e => setEditCfg(p => ({ ...p, [k]: +e.target.value }))}
        style={{ width:"100%", accentColor:T.accent }} />
      <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, color:T.muted, marginTop:2 }}>
        <span>{fmt ? fmt(min) : min}</span><span>{fmt ? fmt(max) : max}</span>
      </div>
    </div>
  );

  const Sec = ({ title, children }) => (
    <div style={{ background:T.card, borderRadius:16, padding:18, border:`1px solid ${T.border}`, marginBottom:12 }}>
      <div style={{ fontSize:13, fontWeight:700, color:T.text, marginBottom:14 }}>{title}</div>
      {children}
    </div>
  );

  return (
    <div style={{ padding:"12px 16px" }}>
      <div style={{ fontSize:16, fontWeight:700, color:T.text, marginBottom:16 }}>Réglages</div>

      {/* Themes */}
      <Sec title="🎨 Thème de l'application">
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4, 1fr)", gap:8 }}>
          {Object.entries(THEMES).map(([k, th]) => (
            <button key={k} onClick={() => setThemeName(k)} style={{ border:`2px solid ${themeName===k ? T.accent : T.border}`, borderRadius:12, padding:"8px 4px", background:th.bg, cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", gap:4, transition:"all 0.15s" }}>
              <div style={{ width:24, height:24, borderRadius:"50%", background:th.accent, border:`2px solid ${th.border}` }} />
              <div style={{ fontSize:9, fontWeight:600, color:th.text, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", width:"100%", textAlign:"center" }}>{th.name}</div>
              {th.dark && <div style={{ fontSize:8, color:th.muted }}>Sombre</div>}
            </button>
          ))}
        </div>
      </Sec>

      <Sec title="⏱️ Sessions">
        <Slider label="Sessions par jour" k="sessions" min={2} max={12} fmt={v => `${v}x`} />
      </Sec>

      <Sec title="🌅 Horaires">
        <Slider label="Réveil"  k="wake"  min={4}  max={12} fmt={v => `${pad2(v)}:00`} />
        <Slider label="Coucher" k="sleep" min={18} max={26} fmt={v => `${pad2(v%24)}:00`} />
      </Sec>

      <Sec title="📅 Semaine actuelle">
        <Slider label="Semaine" k="week" min={1} max={50} fmt={v => `Semaine ${v}`} />
      </Sec>

      <button onClick={apply} style={{ background:T.accent, color:T.accentText, border:"none", borderRadius:14, padding:"15px 24px", fontSize:16, fontWeight:700, width:"100%", cursor:"pointer", marginBottom:12 }}>
        ✅ Enregistrer
      </button>

      <button onClick={() => { if (window.confirm("Recommencer l'évaluation depuis le début ?")) setProfile(null); }} style={{ background:"transparent", color:T.danger, border:`2px solid ${T.danger}44`, borderRadius:14, padding:"12px 24px", fontSize:14, fontWeight:600, width:"100%", cursor:"pointer" }}>
        🔄 Refaire l'évaluation
      </button>
    </div>
  );
}
