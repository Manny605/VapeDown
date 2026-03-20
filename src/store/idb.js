import { useState, useEffect } from 'react';

const DB_NAME = 'vapedown';
const DB_VERSION = 1;
let _db = null;

async function getDB() {
  if (_db) return _db;
  _db = await new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      const stores = {
        profile:      { keyPath: 'key' },
        logs:         { keyPath: 'id', autoIncrement: true },
        pending_logs: { keyPath: 'id' },
      };
      Object.entries(stores).forEach(([name, opts]) => {
        if (!db.objectStoreNames.contains(name)) {
          const s = db.createObjectStore(name, opts);
          if (name === 'logs') {
            s.createIndex('date', 'date');
            s.createIndex('timestamp', 'timestamp');
          }
        }
      });
    };
    req.onsuccess = () => { _db = req.result; resolve(_db); };
    req.onerror  = () => reject(req.error);
  });
  return _db;
}

function wrap(req) {
  return new Promise((res, rej) => { req.onsuccess = () => res(req.result); req.onerror = () => rej(req.error); });
}
async function storeTx(name, mode = 'readonly') {
  const db = await getDB();
  return db.transaction(name, mode).objectStore(name);
}

/* ── Profile ── */
export async function getProfile() {
  const s = await storeTx('profile');
  const all = await wrap(s.getAll());
  return Object.fromEntries(all.map((e) => [e.key, e.value]));
}
export async function setKey(key, value) {
  const s = await storeTx('profile', 'readwrite');
  return wrap(s.put({ key, value }));
}
export async function saveProfile(data) {
  for (const [k, v] of Object.entries(data)) await setKey(k, v);
}

/* ── React hook ── */
export function useProfile() {
  const [state, setState] = useState({ ready: false, hasProfile: false, profile: {} });
  useEffect(() => {
    getProfile().then((p) => setState({ ready: true, hasProfile: !!p.phase, profile: p }));
  }, []);
  return state;
}

/* ── Logs (bouffées) ── */
export async function addLog(trigger = null) {
  const now = Date.now();
  const record = {
    timestamp: now,
    date: new Date(now).toISOString().split('T')[0],
    trigger,
    synced: false,
  };
  const s = await storeTx('logs', 'readwrite');
  return wrap(s.add(record));
}

export async function getLogsToday() {
  const db = await getDB();
  const today = new Date().toISOString().split('T')[0];
  const s = db.transaction('logs', 'readonly').objectStore('logs');
  return wrap(s.index('date').getAll(today));
}

export async function getLogs(days = 30) {
  const s = await storeTx('logs');
  const all = await wrap(s.getAll());
  const cutoff = Date.now() - days * 86400000;
  return all.filter((l) => l.timestamp >= cutoff).sort((a, b) => b.timestamp - a.timestamp);
}

export async function getLogsByDay(days = 14) {
  const logs = await getLogs(days);
  const map = {};
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000).toISOString().split('T')[0];
    map[d] = 0;
  }
  logs.forEach((l) => { if (map[l.date] !== undefined) map[l.date]++; });
  return map;
}

export async function getTriggerStats(days = 14) {
  const logs = await getLogs(days);
  const map = {};
  logs.filter((l) => l.trigger).forEach((l) => { map[l.trigger] = (map[l.trigger] || 0) + 1; });
  return Object.entries(map).sort((a, b) => b[1] - a[1]);
}

export async function getLastLog() {
  const s = await storeTx('logs');
  const all = await wrap(s.getAll());
  if (!all.length) return null;
  return all.sort((a, b) => b.timestamp - a.timestamp)[0];
}

/* ── Plan & quota ── */
export async function getTodayQuota() {
  const p = await getProfile();
  if (!p.phase) return null;
  const baseQuota = p.baseQuota || 20;
  const weekNumber = getWeekNumber(p.startDate);
  const rate = getRateForPhase(p.phase, p.reductionRate || 0.2);
  return Math.max(1, Math.round(baseQuota * Math.pow(1 - rate, weekNumber)));
}

export async function getDashboardData() {
  const profile = await getProfile();
  const logsToday = await getLogsToday();
  const quota = await getTodayQuota();
  const last = await getLastLog();
  const logs7 = await getLogs(7);
  const logs14 = await getLogs(14);
  const prevWeekLogs = await getLogsInRange(7, 14);

  const todayCount = logsToday.length;
  const avg7 = logs7.length ? (logs7.length / 7).toFixed(1) : null;
  const avg7prev = prevWeekLogs.length ? (prevWeekLogs.length / 7) : null;
  const weekTrend = avg7 && avg7prev ? Math.round(((parseFloat(avg7) - avg7prev) / avg7prev) * 100) : null;
  const baseQuota = profile.baseQuota || 20;
  const totalReduction = quota ? Math.round((1 - quota / baseQuota) * 100) : 0;

  const elapsedSinceLastMs = last ? Date.now() - last.timestamp : null;
  const weekNumber = getWeekNumber(profile.startDate);
  const stopDateEstimate = estimateStopDate(profile);

  return {
    profile,
    todayCount,
    quota,
    quotaLeft: quota ? Math.max(0, quota - todayCount) : null,
    quotaPercent: quota ? Math.min(100, Math.round((todayCount / quota) * 100)) : 0,
    avg7: avg7 ? parseFloat(avg7) : null,
    weekTrend,
    totalReduction,
    elapsedSinceLastMs,
    weekNumber,
    stopDateEstimate,
    phase: profile.phase || 1,
  };
}

async function getLogsInRange(fromDaysAgo, toDaysAgo) {
  const s = await storeTx('logs');
  const all = await wrap(s.getAll());
  const from = Date.now() - fromDaysAgo * 86400000;
  const to   = Date.now() - toDaysAgo  * 86400000;
  return all.filter((l) => l.timestamp >= to && l.timestamp <= from);
}

/* ── Plan ── */
export async function initPlan(baseQuota, reductionRate, goalProject, unitCost) {
  await saveProfile({
    phase: 1,
    baseQuota,
    reductionRate,
    goalProject,
    unitCost: parseFloat(unitCost) || 0,
    startDate: new Date().toISOString().split('T')[0],
    observationDone: false,
  });
}

export async function finishObservation() {
  const logs = await getLogs(3);
  const baseQuota = Math.round(logs.length / 3) || 10;
  await setKey('baseQuota', baseQuota);
  await setKey('observationDone', true);
  await setKey('phase', 2);
  return baseQuota;
}

export async function advancePhase() {
  const p = await getProfile();
  const next = Math.min(4, (p.phase || 1) + 1);
  await setKey('phase', next);
  return next;
}

export async function checkPhaseAdvancement() {
  const p = await getProfile();
  if (!p.phase || p.phase >= 4) return null;
  const quota = await getTodayQuota();
  if (p.phase === 2 && quota <= 10) return 'advance_to_3';
  if (p.phase === 3 && quota <= 5)  return 'advance_to_4';
  return null;
}

/* ── Savings ── */
export async function getSavings() {
  const p = await getProfile();
  if (!p.startDate || !p.baseQuota || !p.unitCost) return 0;
  const days = Math.floor((Date.now() - new Date(p.startDate).getTime()) / 86400000);
  const logs = await getLogs(days + 1);
  const podsAvoided = Math.max(0, (p.baseQuota * days) - logs.length);
  const podsPerUnit = 300;
  return ((podsAvoided / podsPerUnit) * parseFloat(p.unitCost)).toFixed(2);
}

/* ── Helpers ── */
function getWeekNumber(startDate) {
  if (!startDate) return 0;
  const diff = Date.now() - new Date(startDate).getTime();
  return Math.floor(diff / (7 * 86400000));
}

function getRateForPhase(phase, baseRate) {
  const rates = { 1: 0, 2: baseRate, 3: baseRate * 1.5, 4: baseRate * 2 };
  return rates[phase] || baseRate;
}

function estimateStopDate(profile) {
  if (!profile.baseQuota || !profile.startDate || !profile.reductionRate) return null;
  let quota = profile.baseQuota;
  const rate = profile.reductionRate || 0.2;
  let weeks = 0;
  while (quota > 1 && weeks < 52) { quota = quota * (1 - rate); weeks++; }
  const est = new Date(profile.startDate);
  est.setDate(est.getDate() + weeks * 7);
  return est.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

export function formatElapsed(ms) {
  if (!ms) return null;
  const totalMin = Math.floor(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}
