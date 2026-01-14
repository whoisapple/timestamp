const pad2 = (n) => String(n).padStart(2, "0");

export function formatHMS(sec) {
  const s = Math.max(0, Math.floor(sec || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  return `${pad2(h)}:${pad2(m)}:${pad2(r)}`;
}