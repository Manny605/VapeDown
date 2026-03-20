let id = null;
let base = null;

function fmt(ms) {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

self.onmessage = ({ data }) => {
  if (data.type === 'START') {
    base = data.base;
    if (id) clearInterval(id);
    id = setInterval(() => self.postMessage({ type: 'TICK', value: fmt(Date.now() - base) }), 30000);
    self.postMessage({ type: 'TICK', value: fmt(Date.now() - base) });
  }
  if (data.type === 'STOP') { clearInterval(id); id = null; }
};
