const BASE: string = (import.meta as any).env?.VITE_API_URL ?? "http://localhost:8000";
const KEY = "raise_token";

// sessionStorage = one login per browser tab, so being signed in as admin in one tab can never
// overwrite the reviewer/author login of another tab (that caused random 403 errors with localStorage).
localStorage.removeItem(KEY);
export const tokenStore = {
  get: () => sessionStorage.getItem(KEY),
  set: (t: string) => sessionStorage.setItem(KEY, t),
  clear: () => sessionStorage.removeItem(KEY),
};

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) { super(message); this.status = status; }
}

async function toError(res: Response): Promise<ApiError> {
  let msg = `Request failed (${res.status})`;
  try {
    const j = await res.json();
    if (typeof j.detail === "string") msg = j.detail;
    else if (Array.isArray(j.detail)) msg = j.detail.map((d: any) => `${(d.loc || []).slice(-1)[0] ?? ""}: ${d.msg}`).join("; ");
  } catch { /* ignore */ }
  return new ApiError(msg, res.status);
}

async function raw(path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  const t = tokenStore.get();
  if (t) headers.set("Authorization", `Bearer ${t}`);
  let res: Response;
  try { res = await fetch(BASE + "/api" + path, { ...init, headers }); }
  catch { throw new ApiError("Cannot reach the server. Is the backend running?", 0); }
  if (!res.ok) {
    if (res.status === 401 && t && !path.startsWith("/auth/login")) window.dispatchEvent(new Event("raise:logout"));
    throw await toError(res);
  }
  return res;
}

const json = (method: string, body?: unknown): RequestInit => ({
  method, headers: { "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body),
});

export const api = {
  get: async <T = any>(p: string): Promise<T> => (await raw(p)).json(),
  post: async <T = any>(p: string, body?: unknown): Promise<T> => (await raw(p, json("POST", body))).json(),
  put: async <T = any>(p: string, body?: unknown): Promise<T> => (await raw(p, json("PUT", body))).json(),
  patch: async <T = any>(p: string, body?: unknown): Promise<T> => (await raw(p, json("PATCH", body))).json(),
  del: async <T = any>(p: string): Promise<T> => (await raw(p, { method: "DELETE" })).json(),
  upload: async <T = any>(p: string, form: FormData): Promise<T> => (await raw(p, { method: "POST", body: form })).json(),
  blob: async (p: string): Promise<Blob> => (await raw(p)).blob(),
};

export async function downloadPdf(path: string, filename: string) {
  const blob = await api.blob(path);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
