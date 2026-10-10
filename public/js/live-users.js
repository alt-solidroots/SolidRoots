// Simulated "browsing now" counter: random walk kept within 120–170, ticks every 1–2s.
(() => {
  const el = document.getElementById('live-users');
  if (!el) return;
  let n = 130 + Math.floor(Math.random() * 25);
  const tick = () => {
    n = Math.min(170, Math.max(120, n + Math.floor(Math.random() * 7) - 3));
    el.textContent = n;
    setTimeout(tick, 1000 + Math.random() * 1000);
  };
  tick();
})();
