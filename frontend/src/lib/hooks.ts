import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "./api";

/** Fetch from the API and (optionally) poll so dashboards stay live with the database. */
export function useFetch<T = any>(path: string | null, opts: { poll?: number } = {}) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(!!path);
  const alive = useRef(true);
  const seq = useRef(0);

  const load = useCallback(async (silent = false) => {
    if (!path) return;
    const id = ++seq.current;
    if (!silent) setLoading(true);
    try {
      const d = await api.get<T>(path);
      if (alive.current && id === seq.current) { setData(d); setError(null); }
    } catch (e: any) {
      if (alive.current && id === seq.current && !silent) setError(e.message);
    } finally {
      if (alive.current && id === seq.current) setLoading(false);
    }
  }, [path]);

  useEffect(() => { alive.current = true; setData(null); load(); return () => { alive.current = false; }; }, [load]);

  useEffect(() => {
    if (!opts.poll || !path) return;
    const t = setInterval(() => { if (!document.hidden) load(true); }, opts.poll);
    const onVis = () => { if (!document.hidden) load(true); };
    document.addEventListener("visibilitychange", onVis);
    return () => { clearInterval(t); document.removeEventListener("visibilitychange", onVis); };
  }, [opts.poll, path, load]);

  return { data, error, loading, reload: () => load(true), setData };
}

export function usePdfUrl(path: string | null) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let current: string | null = null; let cancelled = false;
    setUrl(null); setError(null);
    if (!path) return;
    api.blob(path).then((b) => {
      if (cancelled) return;
      current = URL.createObjectURL(b); setUrl(current);
    }).catch((e) => !cancelled && setError(e.message));
    return () => { cancelled = true; if (current) URL.revokeObjectURL(current); };
  }, [path]);
  return { url, error };
}

export function useCountdown(target?: string) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  if (!target) return null;
  const diff = new Date(target + "T09:00:00").getTime() - now;
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, over: true };
  return { days: Math.floor(diff / 864e5), hours: Math.floor(diff / 36e5) % 24, minutes: Math.floor(diff / 6e4) % 60, seconds: Math.floor(diff / 1e3) % 60, over: false };
}
