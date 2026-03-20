import { useState } from 'react';
import { initPlan } from '../store/idb.js';
import styles from './Onboarding.module.css';

const RATES = [
  { id: 'gentle', label: 'Progressif',  rate: 0.15, desc: '−15% / semaine',  weeks: '~16 semaines' },
  { id: 'moderate', label: 'Modéré',    rate: 0.25, desc: '−25% / semaine',  weeks: '~10 semaines' },
  { id: 'fast', label: 'Rapide',        rate: 0.35, desc: '−35% / semaine',  weeks: '~7 semaines'  },
];

const STEPS = ['welcome', 'observe', 'rhythm', 'goal', 'ready'];

export default function Onboarding() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({ rate: 'moderate', goalProject: '', unitCost: '' });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const current = STEPS[step];

  const estimatedWeeks = RATES.find((r) => r.id === form.rate)?.weeks || '';

  async function finish() {
    const rateVal = RATES.find((r) => r.id === form.rate)?.rate || 0.25;
    await initPlan(20, rateVal, form.goalProject, form.unitCost);
    window.location.href = '/';
  }

  return (
    <div className={styles.wrap}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.logo}>VD</div>
        <span className={styles.appName}>VapeDown</span>
        <span className={styles.credit}>par A.Kamara</span>
      </div>

      {/* Progress */}
      <div className={styles.progress}>
        {STEPS.map((_, i) => (
          <div key={i} className={`${styles.progDot} ${i <= step ? styles.progActive : ''}`} />
        ))}
      </div>

      {/* Welcome */}
      {current === 'welcome' && (
        <div className={styles.screen}>
          <div className={`${styles.tag} fade-up`}>Réduction progressive</div>
          <h1 className={`${styles.h1} fade-up-1`}>Arrêter le vapotage,<br />à ton rythme.</h1>
          <p className={`${styles.body} fade-up-2`}>
            VapeDown ne te demande pas d'arrêter du jour au lendemain. On réduit progressivement, semaine après semaine, jusqu'à zéro.
          </p>
          <div className={`${styles.pillRow} fade-up-3`}>
            {['Quota adaptatif', 'Sans culpabilité', 'Données réelles', 'Offline-first'].map((t) => (
              <span key={t} className={styles.pill}>{t}</span>
            ))}
          </div>
          <button className={`btn btn-primary ${styles.cta} fade-up-4`} onClick={() => setStep(1)}>
            Commencer →
          </button>
        </div>
      )}

      {/* Observe */}
      {current === 'observe' && (
        <div className={styles.screen}>
          <div className={styles.tag}>Étape 1 / 4</div>
          <h2 className={styles.h2}>D'abord, on observe.</h2>
          <p className={styles.body}>
            Pendant 3 jours, logue chaque bouffée sans restriction. L'app mesure ta consommation réelle pour construire un plan honnête — pas basé sur une estimation.
          </p>
          <div className={styles.infoBox}>
            <div className={styles.infoRow}>
              <span className={styles.infoIcon}>○</span>
              <span>Un tap = une bouffée loguée</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoIcon}>○</span>
              <span>Pas de quota les 3 premiers jours</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoIcon}>○</span>
              <span>Ton plan se génère automatiquement</span>
            </div>
          </div>
          <div className={styles.btnGroup}>
            <button className={`btn btn-primary ${styles.cta}`} onClick={() => setStep(2)}>Compris →</button>
            <button className={`btn btn-ghost`} onClick={() => setStep(0)}>← Retour</button>
          </div>
        </div>
      )}

      {/* Rhythm */}
      {current === 'rhythm' && (
        <div className={styles.screen}>
          <div className={styles.tag}>Étape 2 / 4</div>
          <h2 className={styles.h2}>Choisis ton rythme.</h2>
          <p className={styles.body}>Quel rythme de réduction veux-tu maintenir ?</p>
          <div className={styles.rateList}>
            {RATES.map((r) => (
              <button
                key={r.id}
                className={`${styles.rateBtn} ${form.rate === r.id ? styles.rateSel : ''}`}
                onClick={() => set('rate', r.id)}
              >
                <div className={styles.rateLeft}>
                  <span className={styles.rateLabel}>{r.label}</span>
                  <span className={styles.rateDesc}>{r.desc}</span>
                </div>
                <span className={styles.rateWeeks}>{r.weeks}</span>
              </button>
            ))}
          </div>
          <div className={styles.estimateBox}>
            Arrêt estimé dans <strong style={{ color: 'var(--accent)' }}>{estimatedWeeks}</strong> selon ce rythme.
          </div>
          <div className={styles.btnGroup}>
            <button className={`btn btn-primary ${styles.cta}`} onClick={() => setStep(3)}>Suivant →</button>
            <button className={`btn btn-ghost`} onClick={() => setStep(1)}>← Retour</button>
          </div>
        </div>
      )}

      {/* Goal */}
      {current === 'goal' && (
        <div className={styles.screen}>
          <div className={styles.tag}>Étape 3 / 4</div>
          <h2 className={styles.h2}>Ta motivation.</h2>
          <p className={styles.body}>Ces informations apparaissent dans ton dashboard — rappel silencieux de pourquoi tu le fais.</p>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Projet pour tes économies</label>
            <input
              type="text"
              placeholder="Voyage, remboursement, achat..."
              value={form.goalProject}
              onChange={(e) => set('goalProject', e.target.value)}
            />
          </div>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Coût par pod / cartouche (€)</label>
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="0.1"
              placeholder="ex : 8.50"
              value={form.unitCost}
              onChange={(e) => set('unitCost', e.target.value)}
            />
          </div>
          <div className={styles.btnGroup}>
            <button className={`btn btn-primary ${styles.cta}`} onClick={() => setStep(4)}>Suivant →</button>
            <button className={`btn btn-ghost`} onClick={() => setStep(2)}>← Retour</button>
          </div>
        </div>
      )}

      {/* Ready */}
      {current === 'ready' && (
        <div className={styles.screen}>
          <div className={styles.tag}>Étape 4 / 4</div>
          <h2 className={styles.h2}>Tout est prêt.</h2>
          <p className={styles.body}>Voici ce qui t'attend :</p>
          <div className={styles.summaryList}>
            <div className={styles.summaryRow}>
              <span className={styles.summaryKey}>Rythme</span>
              <span className={styles.summaryVal}>{RATES.find((r) => r.id === form.rate)?.desc}</span>
            </div>
            <div className={styles.summaryRow}>
              <span className={styles.summaryKey}>Arrêt estimé</span>
              <span className={styles.summaryVal} style={{ color: 'var(--accent)' }}>{estimatedWeeks}</span>
            </div>
            {form.goalProject && (
              <div className={styles.summaryRow}>
                <span className={styles.summaryKey}>Objectif</span>
                <span className={styles.summaryVal}>{form.goalProject}</span>
              </div>
            )}
          </div>
          <div className={styles.creditBox}>
            <span className={styles.creditApp}>VapeDown</span>
            <span className={styles.creditDev}>Développé par A.Kamara</span>
          </div>
          <div className={styles.btnGroup}>
            <button className={`btn btn-primary ${styles.cta}`} onClick={finish}>
              Démarrer l'observation →
            </button>
            <button className={`btn btn-ghost`} onClick={() => setStep(3)}>← Retour</button>
          </div>
        </div>
      )}
    </div>
  );
}
