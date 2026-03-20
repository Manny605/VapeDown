import { useState } from 'react';
import { getProfile, saveProfile, setKey } from '../store/idb.js';
import styles from './Settings.module.css';

const RATES = [
  { id: 'gentle',   label: 'Progressif', rate: 0.15, desc: '−15% / semaine' },
  { id: 'moderate', label: 'Modéré',     rate: 0.25, desc: '−25% / semaine' },
  { id: 'fast',     label: 'Rapide',     rate: 0.35, desc: '−35% / semaine' },
];

function rateIdFromValue(val) {
  const match = RATES.find((r) => Math.abs(r.rate - val) < 0.01);
  return match?.id || 'moderate';
}

export default function Settings() {
  const [confirmReset, setConfirmReset] = useState(false);
  const [notifStatus, setNotifStatus]   = useState(Notification?.permission || 'default');
  const [rateId, setRateId]             = useState(null);
  const [rateSaved, setRateSaved]       = useState(false);
  const [profile, setProfile]           = useState(null);

  // Load profile once
  useState(() => {
    getProfile().then((p) => {
      setProfile(p);
      setRateId(rateIdFromValue(p.reductionRate || 0.25));
    });
  });

  async function handleRateSave() {
    const rate = RATES.find((r) => r.id === rateId)?.rate || 0.25;
    await setKey('reductionRate', rate);
    setRateSaved(true);
    setTimeout(() => setRateSaved(false), 2000);
  }

  async function requestNotif() {
    if (!('Notification' in window)) return;
    const result = await Notification.requestPermission();
    setNotifStatus(result);
  }

  function handleReset() {
    indexedDB.deleteDatabase('vapedown');
    window.location.href = '/';
  }

  return (
    <div className={styles.wrap}>

      {/* Rythme de réduction */}
      <div className={`${styles.section} fade-up`}>
        <div className="label" style={{ marginBottom: 12 }}>Rythme de réduction</div>
        <div className={styles.rateList}>
          {RATES.map((r) => (
            <button
              key={r.id}
              className={`${styles.rateBtn} ${rateId === r.id ? styles.rateSel : ''}`}
              onClick={() => setRateId(r.id)}
            >
              <span className={styles.rateLabel}>{r.label}</span>
              <span className={styles.rateDesc}>{r.desc}</span>
            </button>
          ))}
        </div>
        <button
          className={`btn btn-primary ${styles.saveBtn}`}
          onClick={handleRateSave}
          disabled={!rateId}
        >
          {rateSaved ? '✓ Sauvegardé' : 'Enregistrer'}
        </button>
      </div>

      {/* Notifications */}
      <div className={`${styles.section} fade-up-1`}>
        <div className="label" style={{ marginBottom: 12 }}>Notifications</div>
        <div className={`card ${styles.row}`}>
          <div>
            <div className={styles.rowTitle}>Alertes push</div>
            <div className={styles.rowSub}>
              {notifStatus === 'granted'  && 'Activées'}
              {notifStatus === 'denied'   && 'Bloquées dans le navigateur'}
              {notifStatus === 'default'  && 'Non configurées'}
            </div>
          </div>
          {notifStatus !== 'granted' && notifStatus !== 'denied' && (
            <button className={styles.chip} onClick={requestNotif}>Activer</button>
          )}
          {notifStatus === 'granted' && <span className={styles.chipOn}>ON</span>}
          {notifStatus === 'denied'  && <span className={styles.chipOff}>OFF</span>}
        </div>
      </div>

      {/* À propos */}
      <div className={`${styles.section} fade-up-2`}>
        <div className="label" style={{ marginBottom: 12 }}>À propos</div>
        <div className={`card ${styles.aboutCard}`}>
          <div className={styles.aboutRow}>
            <span className={styles.aboutKey}>Application</span>
            <span className={styles.aboutVal}>VapeDown</span>
          </div>
          <div className={styles.aboutRow}>
            <span className={styles.aboutKey}>Développeur</span>
            <span className={styles.aboutVal}>A.Kamara</span>
          </div>
          <div className={styles.aboutRow}>
            <span className={styles.aboutKey}>Stockage</span>
            <span className={styles.aboutVal}>Local · Offline-first</span>
          </div>
          {profile?.startDate && (
            <div className={styles.aboutRow}>
              <span className={styles.aboutKey}>Démarré le</span>
              <span className={styles.aboutVal}>
                {new Date(profile.startDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Zone danger */}
      <div className={`${styles.section} fade-up-3`}>
        <div className="label" style={{ marginBottom: 12 }}>Zone de danger</div>
        {!confirmReset ? (
          <button className={`btn btn-ghost ${styles.dangerBtn}`} onClick={() => setConfirmReset(true)}>
            Réinitialiser toutes les données
          </button>
        ) : (
          <div className={`card card-danger ${styles.confirmBox}`}>
            <p style={{ fontSize: 13, color: 'var(--danger)', marginBottom: 12 }}>
              Toutes les données seront supprimées définitivement. Cette action est irréversible.
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-ghost" style={{ height: 40, fontSize: 13 }} onClick={() => setConfirmReset(false)}>
                Annuler
              </button>
              <button
                className="btn"
                style={{ height: 40, fontSize: 13, background: 'var(--danger)', color: '#fff' }}
                onClick={handleReset}
              >
                Confirmer la suppression
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
