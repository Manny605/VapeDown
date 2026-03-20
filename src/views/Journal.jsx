import { useState, useEffect } from 'react';
import { getLogs, formatElapsed } from '../store/idb.js';
import styles from './Journal.module.css';

const TRIGGER_COLORS = {
  Café:   '#FB923C',
  Stress: '#F87171',
  Ennui:  '#7C6AF7',
  Social: '#4ADE80',
  Repas:  '#FB923C',
  Autre:  '#7A9ABB',
};

export default function Journal() {
  const [logs, setLogs]   = useState([]);
  const [days, setDays]   = useState(7);
  const [grouped, setGrouped] = useState({});

  useEffect(() => {
    getLogs(days).then((l) => {
      setLogs(l);
      setGrouped(groupByDay(l));
    });
  }, [days]);

  const totalToday = grouped[today()] ? grouped[today()].length : 0;

  return (
    <div className={styles.wrap}>
      {/* Header stats */}
      <div className={styles.headerRow}>
        <div className={`card ${styles.hCard}`}>
          <div className="label">Aujourd'hui</div>
          <div className={styles.hVal} style={{ color: 'var(--accent)' }}>{totalToday}</div>
        </div>
        <div className={`card ${styles.hCard}`}>
          <div className="label">Total ({days}j)</div>
          <div className={styles.hVal}>{logs.length}</div>
        </div>
        <div className={`card ${styles.hCard}`}>
          <div className="label">Délai moy.</div>
          <div className={styles.hVal} style={{ color: '#4ADE80' }}>
            {avgDelay(logs)}
          </div>
        </div>
      </div>

      {/* Period selector */}
      <div className={styles.periodRow}>
        {[3, 7, 14, 30].map((d) => (
          <button
            key={d}
            className={`${styles.periodBtn} ${days === d ? styles.periodActive : ''}`}
            onClick={() => setDays(d)}
          >{d}j</button>
        ))}
      </div>

      {/* Log list grouped by day */}
      {Object.keys(grouped).sort((a, b) => b.localeCompare(a)).map((date) => (
        <div key={date} className={styles.dayGroup}>
          <div className={styles.dayHeader}>
            <span className={styles.dayLabel}>{formatDate(date)}</span>
            <span className={`badge badge-muted`}>{grouped[date].length}</span>
          </div>
          <div className={`card ${styles.dayCard}`}>
            {grouped[date].map((log, i) => {
              const prev = grouped[date][i + 1];
              const gap = prev ? log.timestamp - prev.timestamp : null;
              return (
                <div key={log.id || i} className={styles.logItem}>
                  <div className={styles.logLeft}>
                    <span className={styles.logTime}>{formatTime(log.timestamp)}</span>
                    {log.trigger && (
                      <span
                        className={styles.logTrigger}
                        style={{ color: TRIGGER_COLORS[log.trigger] || '#7A9ABB', background: (TRIGGER_COLORS[log.trigger] || '#7A9ABB') + '18' }}
                      >{log.trigger}</span>
                    )}
                  </div>
                  <div className={styles.logRight}>
                    <span className={styles.logIndex}>#{grouped[date].length - i}</span>
                    {gap && <span className={styles.logGap}>{formatElapsed(gap)}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {logs.length === 0 && (
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>○</div>
          <p>Aucune entrée sur {days} jours.</p>
        </div>
      )}

      <div className={styles.footerCredit}>VapeDown · par A.Kamara</div>
    </div>
  );
}

function groupByDay(logs) {
  return logs.reduce((acc, l) => {
    const d = new Date(l.timestamp).toISOString().split('T')[0];
    if (!acc[d]) acc[d] = [];
    acc[d].push(l);
    return acc;
  }, {});
}

function today() {
  return new Date().toISOString().split('T')[0];
}

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  const isToday = dateStr === today();
  if (isToday) return "Aujourd'hui";
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
}

function formatTime(ts) {
  return new Date(ts).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function avgDelay(logs) {
  if (logs.length < 2) return '—';
  const sorted = [...logs].sort((a, b) => a.timestamp - b.timestamp);
  let total = 0;
  for (let i = 1; i < sorted.length; i++) total += sorted[i].timestamp - sorted[i - 1].timestamp;
  const avg = total / (sorted.length - 1);
  return formatElapsed(avg) || '—';
}
