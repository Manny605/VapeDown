import { useState, useEffect } from 'react';
import { getProfile, getDashboardData, setKey, getTodayQuota, advancePhase, finishObservation } from '../store/idb.js';
import styles from './Plan.module.css';

const PHASE_LABELS = ['', 'Observation', 'Réduction douce', 'Accélération', 'Arrêt final'];
const PHASE_DESC = [
  '',
  'Tu loggues sans contrainte. Le plan se construit sur tes données réelles.',
  'Quota réduit de 15–25% chaque semaine. Rythme régulier et tenable.',
  'Réductions plus importantes. Fenêtres horaires introduites progressivement.',
  'Moins de 5 bouffées par jour. L\'arrêt total est proche.',
];

const RATES = [
  { id: 'gentle',   rate: 0.15, label: 'Progressif',  desc: '−15%/sem' },
  { id: 'moderate', rate: 0.25, label: 'Modéré',       desc: '−25%/sem' },
  { id: 'fast',     rate: 0.35, label: 'Rapide',       desc: '−35%/sem' },
];

export default function Plan() {
  const [dash, setDash]       = useState(null);
  const [profile, setProfile] = useState(null);
  const [quota, setQuota]     = useState(null);
  const [editing, setEditing] = useState(false);
  const [newRate, setNewRate] = useState(null);
  const [obsFinished, setObsFinished] = useState(false);

  useEffect(() => {
    Promise.all([getDashboardData(), getProfile(), getTodayQuota()]).then(([d, p, q]) => {
      setDash(d);
      setProfile(p);
      setQuota(q);
      setNewRate(RATES.find((r) => Math.abs(r.rate - (p.reductionRate || 0.25)) < 0.01)?.id || 'moderate');
    });
  }, [obsFinished]);

  async function handleFinishObs() {
    const base = await finishObservation();
    setObsFinished(true);
    alert(`Observation terminée. Quota de base : ${base} bouffées/jour.`);
  }

  async function handleRateChange() {
    const r = RATES.find((x) => x.id === newRate);
    if (!r) return;
    await setKey('reductionRate', r.rate);
    setEditing(false);
    const [d, p, q] = await Promise.all([getDashboardData(), getProfile(), getTodayQuota()]);
    setDash(d); setProfile(p); setQuota(q);
  }

  async function handleAdvancePhase() {
    await advancePhase();
    const [d, p, q] = await Promise.all([getDashboardData(), getProfile(), getTodayQuota()]);
    setDash(d); setProfile(p); setQuota(q);
  }

  if (!dash || !profile) return <div className={styles.loading}><div className={styles.spinner} /></div>;

  const phase = profile.phase || 1;
  const baseQuota = profile.baseQuota || 20;
  const progress = Math.min(100, Math.round((1 - (quota || baseQuota) / baseQuota) * 100));
  const currentRate = RATES.find((r) => Math.abs(r.rate - (profile.reductionRate || 0.25)) < 0.01);

  const weeks = [];
  let q = baseQuota;
  const rate = profile.reductionRate || 0.25;
  for (let i = 0; i <= 12 && q > 1; i++) {
    weeks.push({ week: i, quota: Math.round(q) });
    q = q * (1 - rate);
  }

  return (
    <div className={styles.wrap}>

      {/* Phase actuelle */}
      <div className={`card card-accent ${styles.phaseCard} fade-up`}>
        <div className={styles.phaseHeader}>
          <div>
            <div className="label">Phase actuelle</div>
            <div className={styles.phaseName}>{PHASE_LABELS[phase]}</div>
          </div>
          <span className={`badge badge-accent`}>Phase {phase} / 4</span>
        </div>
        <p className={styles.phaseDesc}>{PHASE_DESC[phase]}</p>
      </div>

      {/* Observation CTA */}
      {phase === 1 && (
        <div className={`card ${styles.obsCard} fade-up-1`}>
          <div className="label" style={{ marginBottom: 8 }}>Fin de la phase d'observation</div>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 14 }}>
            Tu as loggué pendant 3 jours ? L'app peut maintenant calculer ton quota de base.
          </p>
          <button className="btn btn-primary" style={{ height: 46, fontSize: 13 }} onClick={handleFinishObs}>
            Terminer l'observation →
          </button>
        </div>
      )}

      {/* Quota aujourd'hui */}
      {phase > 1 && quota && (
        <div className={`card ${styles.quotaCard} fade-up-1`}>
          <div className={styles.quotaRow}>
            <div>
              <div className="label">Quota aujourd'hui</div>
              <div className={styles.quotaBig}>{quota}</div>
              <div className={styles.quotaSub}>bouffées / jour</div>
            </div>
            <div className={styles.quotaRight}>
              <div className="label">De départ</div>
              <div className={styles.quotaBase}>{baseQuota}</div>
            </div>
          </div>
          <div className="gauge-track" style={{ marginTop: 12 }}>
            <div className="gauge-fill" style={{ width: `${progress}%`, background: 'var(--accent)' }} />
          </div>
          <div className={styles.progressLabel}>{progress}% du chemin parcouru</div>
        </div>
      )}

      {/* Rythme */}
      <div className={`card ${styles.rateCard} fade-up-2`}>
        <div className={styles.rateHeader}>
          <div>
            <div className="label">Rythme de réduction</div>
            <div className={styles.rateName}>{currentRate?.label || '—'} · {currentRate?.desc || '—'}</div>
          </div>
          {!editing && (
            <button className={styles.editBtn} onClick={() => setEditing(true)}>Modifier</button>
          )}
        </div>
        {editing && (
          <div className={styles.rateEdit}>
            {RATES.map((r) => (
              <button
                key={r.id}
                className={`${styles.rateOpt} ${newRate === r.id ? styles.rateOptSel : ''}`}
                onClick={() => setNewRate(r.id)}
              >
                <span className={styles.rateOptLabel}>{r.label}</span>
                <span className={styles.rateOptDesc}>{r.desc}</span>
              </button>
            ))}
            <div className={styles.editActions}>
              <button className="btn btn-primary" style={{ height: 44, fontSize: 13 }} onClick={handleRateChange}>Confirmer</button>
              <button className="btn btn-ghost" style={{ height: 44, fontSize: 13 }} onClick={() => setEditing(false)}>Annuler</button>
            </div>
          </div>
        )}
      </div>

      {/* Roadmap */}
      {phase > 1 && weeks.length > 0 && (
        <div className={`card ${styles.roadmapCard} fade-up-3`}>
          <div className="label" style={{ marginBottom: 12 }}>Roadmap — Quota par semaine</div>
          <div className={styles.roadmapList}>
            {weeks.slice(0, 8).map(({ week, quota: q }) => {
              const isCurrent = week === dash.weekNumber;
              const isPast = week < dash.weekNumber;
              return (
                <div
                  key={week}
                  className={`${styles.roadmapRow} ${isCurrent ? styles.roadmapCurrent : ''} ${isPast ? styles.roadmapPast : ''}`}
                >
                  <span className={styles.roadmapWeek}>Sem. {week + 1}</span>
                  <div className={styles.roadmapBar}>
                    <div className={styles.roadmapFill} style={{ width: `${(q / baseQuota) * 100}%` }} />
                  </div>
                  <span className={styles.roadmapQuota}>{q}/j</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Arrêt estimé */}
      {dash.stopDateEstimate && phase > 1 && (
        <div className={`card card-success ${styles.stopCard} fade-up-4`}>
          <div className="label">Arrêt total estimé</div>
          <div className={styles.stopDate}>{dash.stopDateEstimate}</div>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
            Basé sur ton rythme actuel. Se met à jour chaque semaine.
          </p>
        </div>
      )}

      {/* Avancer phase (dev helper) */}
      {phase < 4 && phase > 1 && (
        <button className="btn btn-ghost" style={{ height: 42, fontSize: 12 }} onClick={handleAdvancePhase}>
          Passer à la phase {phase + 1} →
        </button>
      )}

      <div className={styles.footerCredit}>VapeDown · par A.Kamara</div>
    </div>
  );
}
