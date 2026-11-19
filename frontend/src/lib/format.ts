export const fmtDate = (s?: string | null, long = false) =>
  s ? new Date(s.length === 10 ? s + "T00:00:00" : s).toLocaleDateString("en-IN", { day: "numeric", month: long ? "long" : "short", year: "numeric" }) : "—";
export const fmtDateTime = (s?: string | null) =>
  s ? new Date(s).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";
export const timeAgo = (s: string) => {
  const m = Math.floor((Date.now() - new Date(s).getTime()) / 60000);
  if (m < 1) return "just now"; if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24); return d < 30 ? `${d}d ago` : fmtDate(s);
};
export const fmtSize = (n: number) => (n > 1048576 ? (n / 1048576).toFixed(1) + " MB" : Math.max(1, Math.round(n / 1024)) + " KB");
export const label = (s?: string | null) => (s ?? "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
export const dateRange = (a?: string, b?: string) => {
  if (!a) return "";
  const x = new Date(a + "T00:00:00"), y = b ? new Date(b + "T00:00:00") : x;
  const mon = x.toLocaleDateString("en-IN", { month: "long" });
  return x.getMonth() === y.getMonth() ? `${x.getDate()}–${y.getDate()} ${mon} ${x.getFullYear()}` : `${fmtDate(a)} – ${fmtDate(b)}`;
};
