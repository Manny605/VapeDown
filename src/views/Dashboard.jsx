import { useState, useEffect, useCallback } from 'react';
import { getDashboardData, addLog, formatElapsed, getSavings } from '../store/idb.js';
import styles from './Dashboard.module.css';

const TRIGGERS = ['Café', 'Stress', 'Ennui', 'Social', 'Repas', 'Autre'];

export default function Dashboard() {
  const [data, setData]       = useState(null);
  const [savings, setSavings] = useState('0.00');
  const [logging, setLogging] = useState(false);
  const [trigger, setTrigger] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [elapsed, setElapsed] = useState(null);

  const load = useCallback(async () => {
    const [d, s] = await Promise.all([getDashboardData(), getSavings()]);
    setData(d);
    setSavings(s);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Live elapsed timer
  useEffect(() => {
    if (!data?.elapsedSinceLastMs) return;
    const base = Date.now() - data.elapsedSinceLastMs;
    const id = setInterval(() => setElapsed(formatElapsed(Date.now() - base)), 10000);
    setElapsed(formatElapsed(data.elapsedSinceLastMs));
    return () => clearInterval(id);
  }, [data?.elapsedSinceLastMs]);

  async function handleLog() {
    await addLog(trigger);
    setLogging(false);
    setTrigger(null);
    setFeedback('logged');
    setTimeout(() => setFeedback(null), 2000);
    load();
  }

  if (!data) return <div className={styles.loading}><div className={styles.spinner} /></div>;

  const { todayCount, quota, quotaLeft, quotaPercent, avg7, weekTrend, totalReduction, phase, profile, stopDateEstimate } = data;
  const isObserving = profile.phase === 1;
  const gaugeColor = quotaPercent >= 100 ? '#F87171' : quotaPercent >= 80 ? '#FB923C' : '#4ADE80';

  return (
    <div className={styles.wrap}>
      {/* Phase / observation banner */}
      {isObserving && (
        <div className={`${styles.observeBanner} fade-up`}>
          <span className={styles.observeIcon}>◎</span>
          <span>Phase d'observation — pas de quota pendant 3 jours</span>
        </div>
      )}

      {/* Main vape button */}
      <div className={`${styles.vaperSection} fade-up-1`}>
        {!logging ? (
          <button
            className={`${styles.vaperBtn} ${feedback === 'logged' ? styles.vaperBtnFeedback : ''}`}
            onClick={() => setLogging(true)}
          >
            {feedback === 'logged' ? (
              <><span className={styles.vaperBtnIcon}>✓</span><span>Loguée !</span></>
            ) : (
              <><span className={styles.vaperBtnIcon}>+</span><span>J'ai vapé</span></>
            )}
          </button>
        ) : (
          <div className={`${styles.triggerPanel} card`}>
            <p className={styles.triggerPrompt}>Contexte (optionnel)</p>
            <div className={styles.triggerGrid}>
              {TRIGGERS.map((t) => (
                <button
                  key={t}
                  className={`${styles.triggerBtn} ${trigger === t ? styles.triggerSel : ''}`}
                  onClick={() => setTrigger(trigger === t ? null : t)}
                >{t}</button>
              ))}
            </div>
            <div className={styles.triggerActions}>
              <button className={`btn btn-primary`} style={{ height: 44, fontSize: 13 }} onClick={handleLog}>
                Confirmer
              </button>
              <button className={`btn btn-ghost`} style={{ height: 44, fontSize: 13 }} onClick={() => { setLogging(false); setTrigger(null); }}>
                Annuler
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Quota gauge */}
      {!isObserving && quota && (
        <div className={`card ${styles.quotaCard} fade-up-2`}>
          <div className={styles.quotaHeader}>
            <div>
              <div className="label">Quota aujourd'hui</div>
              <div className={styles.quotaCount}>
                <span style={{ color: gaugeColor, fontSize: 28, fontWeight: 700 }}>{todayCount}</span>
                <span className={styles.quotaOf}>/ {quota}</span>
              </div>
            </div>
            <div className={styles.quotaRight}>
              {quotaLeft > 0
                ? <><span className={styles.quotaLeftNum} style={{ color: gaugeColor }}>{quotaLeft}</span><span className={styles.quotaLeftLbl}>restantes</span></>
                : <span className={styles.quotaOver}>Quota atteint</span>
              }
            </div>
          </div>
          <div className="gauge-track" style={{ marginTop: 10 }}>
            <div className="gauge-fill" style={{ width: `${Math.min(100, quotaPercent)}%`, background: gaugeColor }} />
          </div>
        </div>
      )}

      {/* Observation counter */}
      {isObserving && (
        <div className={`card ${styles.obsCard} fade-up-2`}>
          <div className="label">Bouffées aujourd'hui</div>
          <div className={styles.obsCount}>{todayCount}</div>
          <p style={{ fontSize: 12, marginTop: 4 }}>Logue normalement. Le plan se génère dans 3 jours.</p>
        </div>
      )}

      {/* Metrics row */}
      <div className={`${styles.metricsRow} fade-up-3`}>
        <div className={`card ${styles.metric}`}>
          <div className="label">Depuis la dernière</div>
          <div className={styles.metricVal} style={{ color: 'var(--text-primary)' }}>
            {elapsed || '—'}
          </div>
        </div>
        <div className={`card ${styles.metric}`}>
          <div className="label">Cette semaine</div>
          <div className={styles.metricVal} style={{ color: weekTrend < 0 ? '#4ADE80' : weekTrend > 0 ? '#F87171' : 'var(--text-primary)' }}>
            {weekTrend !== null ? `${weekTrend > 0 ? '+' : ''}${weekTrend}%` : '—'}
          </div>
        </div>
        <div className={`card ${styles.metric}`}>
          <div className="label">Réduction totale</div>
          <div className={styles.metricVal} style={{ color: 'var(--accent)' }}>
            {totalReduction ? `−${totalReduction}%` : '—'}
          </div>
        </div>
      </div>

      {/* Savings */}
      {profile.goalProject && (
        <div className={`card card-accent ${styles.savingsCard} fade-up-4`}>
          <div className={styles.savingsRow}>
            <div>
              <div className="label">Économies</div>
              <div className={styles.savingsVal}>{savings} €</div>
            </div>
            <div className={styles.savingsGoal}>→ {profile.goalProject}</div>
          </div>
        </div>
      )}

      {/* Stop estimate */}
      {stopDateEstimate && !isObserving && (
        <div className={`card ${styles.stopCard} fade-up-4`}>
          <div className="label">Arrêt estimé</div>
          <div className={styles.stopDate}>{stopDateEstimate}</div>
          <div className={styles.stopPhase}>Phase {phase} / 4 · {getPhaseLabel(phase)}</div>
        </div>
      )}

      {/* Footer credit */}
      <div className={styles.footerCredit}>VapeDown · par A.Kamara</div>
    </div>
  );
}

function getPhaseLabel(p) {
  return ['', 'Observation', 'Réduction douce', 'Accélération', 'Arrêt final'][p] || '';
}
