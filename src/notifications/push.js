export async function requestPermission() {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const r = await Notification.requestPermission();
  return r === 'granted';
}

export async function notify({ title, body, tag = 'vapedown', urgent = false, url = '/' }) {
  const reg = await navigator.serviceWorker.ready;
  await reg.showNotification(title, {
    body, icon: '/icons/192.png', badge: '/icons/192.png',
    tag, requireInteraction: urgent, data: { url },
  });
}

export const NOTIFS = {
  QUOTA_80:   (left) => ({ title: 'Quota presque atteint', body: `Plus que ${left} bouffées aujourd'hui.`, tag: 'quota-80' }),
  QUOTA_DONE: ()     => ({ title: 'Quota du jour atteint', body: 'Tu as atteint ton quota. Bravo pour aujourd\'hui.', tag: 'quota-done' }),
  WEEKLY:     (pct)  => ({ title: 'Rapport hebdomadaire', body: `Semaine écoulée : ${pct > 0 ? '+' : ''}${pct}% vs la précédente.`, tag: 'weekly' }),
  MILESTONE:  (pct)  => ({ title: `−${pct}% atteint !`, body: MILESTONE_MSG[pct] || `Tu as réduit ta consommation de ${pct}%.`, tag: `milestone-${pct}` }),
};

const MILESTONE_MSG = {
  25: 'Premier quart du chemin. Les bénéfices cardiovasculaires commencent.',
  50: 'Mi-chemin. La dépendance comportementale s\'affaiblit.',
  75: 'Trois quarts. Tu y es presque.',
};

export async function checkAndFireMilestones(totalReduction) {
  const fired = JSON.parse(localStorage.getItem('vd_milestones') || '[]');
  for (const pct of [25, 50, 75]) {
    if (totalReduction >= pct && !fired.includes(pct)) {
      await notify(NOTIFS.MILESTONE(pct));
      fired.push(pct);
      localStorage.setItem('vd_milestones', JSON.stringify(fired));
    }
  }
}
