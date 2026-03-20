import { useState, useEffect, useRef } from 'react';
import { getLogsByDay, getTriggerStats, getLogs, getDashboardData } from '../store/idb.js';
import styles from './Stats.module.css';

export default function Stats() {
  const [d, setD] = useState(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    Promise.all([getLogsByDay(14), getTriggerStats(14), getLogs(7), getDashboardData()]).then(
      ([byDay, triggers, logs7, dash]) => {
        const avg7 = logs7.length ? (logs7.length / 7).toFixed(1) : '—';
        setD({ byDay, triggers, avg7, dash });
      }
    );
  }, []);

  useEffect(() => {
    if (!d || !canvasRef.current) return;
    drawChart(canvasRef.current, d.byDay, d.dash.quota);
  }, [d]);

  if (!d) return <div className={styles.loading}><div className={styles.spinner} /></div>;

  const { avg7, triggers, dash } = d;

  return (
    <div className={styles.wrap}>
      <div className={styles.kpiRow}>
        <div className={`card ${styles.kpi}`}>
          <div className="label">Moy. / jour</div>
          <div className={styles.kpiVal} style={{ color: 'var(--accent)' }}>{avg7}</div>
        </div>
        <div className={`card ${styles.kpi}`}>
          <div className="label">Réduction</div>
          <div className={styles.kpiVal} style={{ color: '#4ADE80' }}>
            {dash.totalReduction ? `−${dash.totalReduction}%` : '—'}
          </div>
        </div>
        <div className={`card ${styles.kpi}`}>
          <div className="label">Phase</div>
          <div className={styles.kpiVal} style={{ color: 'var(--accent)' }}>{dash.phase} / 4</div>
        </div>
      </div>

      <div className={`card ${styles.chartCard}`}>
        <div className={styles.chartHeader}>
          <div className="label">Bouffées / jour — 14 jours</div>
          {dash.quota && <span className={`badge badge-muted`}>Quota : {dash.quota}</span>}
        </div>
        <canvas ref={canvasRef} className={styles.canvas} />
      </div>

      {triggers.length > 0 && (
        <div className={`card ${styles.triggersCard}`}>
          <div className="label" style={{ marginBottom: 12 }}>Déclencheurs — 14 jours</div>
          {triggers.slice(0, 5).map(([label, count], i) => {
            const max = triggers[0][1];
            return (
              <div key={i} className={styles.triggerRow}>
                <span className={styles.triggerLabel}>{label}</span>
                <div className={styles.triggerBarWrap}>
                  <div className={styles.triggerBar} style={{ width: `${(count / max) * 100}%` }} />
                </div>
                <span className={styles.triggerCount}>{count}</span>
              </div>
            );
          })}
        </div>
      )}

      <div className={`card ${styles.progressCard}`}>
        <div className={styles.progressHeader}>
          <div className="label">Progression globale</div>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)' }}>
            {dash.totalReduction}%
          </span>
        </div>
        <div className="gauge-track" style={{ marginTop: 8 }}>
          <div className="gauge-fill" style={{ width: `${dash.totalReduction}%`, background: 'var(--accent)' }} />
        </div>
        {dash.stopDateEstimate && (
          <p style={{ fontSize: 12, marginTop: 8, color: 'var(--text-muted)' }}>
            Arrêt estimé : <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{dash.stopDateEstimate}</span>
          </p>
        )}
      </div>

      <div className={styles.footerCredit}>VapeDown · par A.Kamara</div>
    </div>
  );
}

function drawChart(canvas, byDay, quota) {
  const ctx = canvas.getContext('2d');
  const W = canvas.offsetWidth;
  const H = 130;
  canvas.width = W * devicePixelRatio;
  canvas.height = H * devicePixelRatio;
  canvas.style.height = H + 'px';
  ctx.scale(devicePixelRatio, devicePixelRatio);

  const days = Object.keys(byDay).sort();
  const vals = days.map((d) => byDay[d]);
  const maxV = Math.max(...vals, quota || 1, 1);
  const pad = { t: 10, r: 10, b: 22, l: 24 };
  const cW = W - pad.l - pad.r;
  const cH = H - pad.t - pad.b;
  const step = cW / (days.length - 1);

  // Quota line
  if (quota) {
    const qY = pad.t + cH - (quota / maxV) * cH;
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = '#7C6AF740';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(pad.l, qY); ctx.lineTo(pad.l + cW, qY); ctx.stroke();
    ctx.setLineDash([]);
  }

  // Area fill
  ctx.beginPath();
  vals.forEach((v, i) => {
    const x = pad.l + i * step;
    const y = pad.t + cH - (v / maxV) * cH;
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });
  ctx.lineTo(pad.l + (vals.length - 1) * step, pad.t + cH);
  ctx.lineTo(pad.l, pad.t + cH);
  ctx.closePath();
  ctx.fillStyle = '#7C6AF715';
  ctx.fill();

  // Line
  ctx.beginPath();
  vals.forEach((v, i) => {
    const x = pad.l + i * step;
    const y = pad.t + cH - (v / maxV) * cH;
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });
  ctx.strokeStyle = '#7C6AF7';
  ctx.lineWidth = 2;
  ctx.lineJoin = 'round';
  ctx.stroke();

  // Dots
  vals.forEach((v, i) => {
    const x = pad.l + i * step;
    const y = pad.t + cH - (v / maxV) * cH;
    const c = quota && v > quota ? '#F87171' : '#4ADE80';
    ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2);
    ctx.fillStyle = c; ctx.fill();
  });

  // X labels
  ctx.fillStyle = '#2A4A7A';
  ctx.font = `500 9px Poppins, sans-serif`;
  [0, 6, 13].forEach((i) => {
    const label = days[i]?.slice(5) || '';
    const x = pad.l + i * step;
    ctx.fillText(label, x - 10, H - 4);
  });

  // Y labels
  [0, Math.round(maxV / 2), maxV].forEach((v) => {
    const y = pad.t + cH - (v / maxV) * cH;
    ctx.fillText(v, 0, y + 4);
  });
}
