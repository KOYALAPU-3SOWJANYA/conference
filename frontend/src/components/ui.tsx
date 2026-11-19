import clsx from "clsx";
import { AlertCircle, CheckCircle2, Inbox, Loader2, X } from "lucide-react";
import {
  ButtonHTMLAttributes, createContext, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes,
  useCallback, useContext, useEffect, useState,
} from "react";
import { label } from "../lib/format";

export const cn = clsx;

/* ------------------------------------------------------------------ buttons */
type Variant = "primary" | "secondary" | "ghost" | "danger" | "success" | "outline";
export function Button({ variant = "primary", size = "md", loading, icon, children, className, disabled, ...rest }:
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: "sm" | "md" | "lg"; loading?: boolean; icon?: ReactNode }) {
  return (
    <button {...rest} disabled={disabled || loading}
      className={cn("btn", `btn-${variant}`, size === "sm" && "btn-sm", size === "lg" && "btn-lg", className)}>
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}{children}
    </button>
  );
}

/* ------------------------------------------------------------------ form fields */
export function Field({ label: l, hint, error, children, className }: { label: string; hint?: string; error?: string; children: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label className="label">{l}</label>
      {children}
      {hint && !error && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
export const Input = (p: InputHTMLAttributes<HTMLInputElement>) => <input {...p} className={cn("input", p.className)} />;
export const Textarea = (p: TextareaHTMLAttributes<HTMLTextAreaElement>) => <textarea {...p} className={cn("input min-h-[100px] resize-y", p.className)} />;
export const Select = (p: SelectHTMLAttributes<HTMLSelectElement>) => <select {...p} className={cn("input pr-8", p.className)} />;

/* ------------------------------------------------------------------ surfaces */
export const Card = ({ children, className, ...r }: { children: ReactNode; className?: string } & React.HTMLAttributes<HTMLDivElement>) =>
  <div {...r} className={cn("card", className)}>{children}</div>;

export function CardHeader({ title, subtitle, action, icon }: { title: string; subtitle?: string; action?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
      <div className="flex items-center gap-3">
        {icon && <div className="grid h-9 w-9 place-items-center rounded-xl text-white" style={{ backgroundImage: "linear-gradient(135deg,var(--a1),var(--a2))" }}>{icon}</div>}
        <div><h3 className="text-base font-semibold">{title}</h3>{subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}</div>
      </div>
      {action}
    </div>
  );
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3 animate-fadeUp">
      <div><h1 className="text-2xl font-bold md:text-3xl">{title}</h1>{subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}</div>
      {action}
    </div>
  );
}

export function StatCard({ label: l, value, icon, tone = "blue", sub }: { label: string; value: ReactNode; icon: ReactNode; tone?: "blue" | "cyan" | "purple" | "green" | "amber" | "red" | "navy"; sub?: string }) {
  const tones: Record<string, string> = {
    blue: "from-royal to-blue-400", cyan: "from-electric to-cyan-300", purple: "from-plum to-fuchsia-500",
    green: "from-emerald-600 to-emerald-400", amber: "from-amber-500 to-yellow-400", red: "from-red-600 to-rose-400", navy: "from-navy to-royal",
  };
  return (
    <div className="card card-hover relative overflow-hidden p-5">
      <div className={cn("absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br opacity-15", tones[tone])} />
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{l}</p>
          <p className="mt-2 font-display text-3xl font-bold text-navy">{value}</p>
          {sub && <p className="mt-1 text-xs text-slate-400">{sub}</p>}
        </div>
        <div className={cn("grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br text-white shadow-lg", tones[tone])}>{icon}</div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ badges */
const BADGE: Record<string, string> = {
  submitted: "bg-slate-100 text-slate-700 ring-slate-200",
  under_review: "bg-amber-50 text-amber-700 ring-amber-200",
  minor_revision: "bg-cyan-50 text-cyan-700 ring-cyan-200",
  major_revision: "bg-orange-50 text-orange-700 ring-orange-200",
  accepted: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  rejected: "bg-red-50 text-red-700 ring-red-200",
  assigned: "bg-slate-100 text-slate-700 ring-slate-200",
  in_progress: "bg-amber-50 text-amber-700 ring-amber-200",
  completed: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  pending: "bg-amber-50 text-amber-700 ring-amber-200",
  approved: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  active: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  inactive: "bg-slate-100 text-slate-500 ring-slate-200",
  accept: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  reject: "bg-red-50 text-red-700 ring-red-200",
  draft: "bg-amber-50 text-amber-700 ring-amber-200",
  final: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  none: "bg-slate-100 text-slate-600 ring-slate-200",
};
const BADGE_LABEL: Record<string, string> = { none: "Not started", submitted: "Submitted", accept: "Accept", reject: "Reject", final: "Submitted" };
export function StatusBadge({ status }: { status: string }) {
  return <span className={cn("badge", BADGE[status] ?? BADGE.submitted)}><span className="h-1.5 w-1.5 rounded-full bg-current" />{BADGE_LABEL[status] ?? label(status)}</span>;
}

/* ------------------------------------------------------------------ misc */
export const Spinner = ({ className }: { className?: string }) => <Loader2 className={cn("h-5 w-5 animate-spin text-royal", className)} />;
export const PageLoader = () => <div className="grid h-64 place-items-center"><Spinner className="h-8 w-8" /></div>;

export function ErrorBox({ message, retry }: { message: string; retry?: () => void }) {
  return (
    <div className="card flex items-center gap-3 border-red-200 bg-red-50/80 p-4 text-sm text-red-700">
      <AlertCircle className="h-5 w-5 shrink-0" /><span className="flex-1">{message}</span>
      {retry && <Button size="sm" variant="secondary" onClick={retry}>Retry</Button>}
    </div>
  );
}

export function Empty({ title, text, action, icon }: { title: string; text?: string; action?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-slate-100 text-slate-400">{icon ?? <Inbox className="h-7 w-7" />}</div>
      <p className="font-display font-semibold text-navy">{title}</p>
      {text && <p className="mt-1 max-w-sm text-sm text-slate-500">{text}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export const TableWrap = ({ children }: { children: ReactNode }) => <div className="overflow-x-auto"><table className="tbl">{children}</table></div>;

export function ProgressBar({ value, max = 100, className, color }: { value: number; max?: number; className?: string; color?: string }) {
  const pct = max ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className={cn("h-2 w-full overflow-hidden rounded-full bg-slate-100", className)}>
      <div className="h-full rounded-full transition-all duration-700" style={{ width: pct + "%", backgroundImage: color ?? "linear-gradient(90deg,var(--a1),var(--a2))" }} />
    </div>
  );
}

export function Tabs<T extends string>({ tabs, value, onChange }: { tabs: { id: T; label: string; count?: number }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="flex gap-1 overflow-x-auto rounded-xl bg-slate-100/80 p-1">
      {tabs.map((t) => (
        <button key={t.id} onClick={() => onChange(t.id)}
          className={cn("whitespace-nowrap rounded-lg px-3.5 py-1.5 text-sm font-medium transition", value === t.id ? "bg-white text-navy shadow" : "text-slate-500 hover:text-navy")}>
          {t.label}{t.count !== undefined && <span className="ml-1.5 rounded-full bg-slate-200/70 px-1.5 text-[11px]">{t.count}</span>}
        </button>
      ))}
    </div>
  );
}

export function Modal({ open, onClose, title, children, size = "md", footer }: { open: boolean; onClose: () => void; title: string; children: ReactNode; size?: "md" | "lg" | "xl"; footer?: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", k); document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", k); document.body.style.overflow = ""; };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-navy-950/60 p-4 backdrop-blur-sm sm:items-center" onMouseDown={onClose}>
      <div role="dialog" aria-modal="true" onMouseDown={(e) => e.stopPropagation()}
        className={cn("my-8 w-full animate-pop rounded-2xl bg-white shadow-2xl", size === "md" && "max-w-lg", size === "lg" && "max-w-2xl", size === "xl" && "max-w-5xl")}>
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button onClick={onClose} aria-label="Close" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X className="h-5 w-5" /></button>
        </div>
        <div className="px-6 py-5">{children}</div>
        {footer && <div className="flex justify-end gap-2 rounded-b-2xl border-t border-slate-100 bg-slate-50/70 px-6 py-4">{footer}</div>}
      </div>
    </div>
  );
}

export function ConfirmModal({ open, onClose, onConfirm, title, text, confirmLabel = "Confirm", danger, loading }:
  { open: boolean; onClose: () => void; onConfirm: () => void; title: string; text: string; confirmLabel?: string; danger?: boolean; loading?: boolean }) {
  return (
    <Modal open={open} onClose={onClose} title={title}
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button variant={danger ? "danger" : "primary"} loading={loading} onClick={onConfirm}>{confirmLabel}</Button></>}>
      <p className="text-sm text-slate-600">{text}</p>
    </Modal>
  );
}

export function Switch({ checked, onChange, label: l }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)} className="flex items-center gap-3 text-sm font-medium text-slate-700">
      <span className={cn("relative h-6 w-11 rounded-full transition", checked ? "bg-emerald-500" : "bg-slate-300")}>
        <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all", checked ? "left-[22px]" : "left-0.5")} />
      </span>{l}
    </button>
  );
}

/* ------------------------------------------------------------------ toasts */
type Toast = { id: number; msg: string; type: "success" | "error" };
const ToastCtx = createContext<(msg: string, type?: "success" | "error") => void>(() => {});
export const useToast = () => useContext(ToastCtx);
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const push = useCallback((msg: string, type: "success" | "error" = "success") => {
    const id = Date.now() + Math.random();
    setItems((x) => [...x, { id, msg, type }]);
    setTimeout(() => setItems((x) => x.filter((t) => t.id !== id)), 4200);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed right-4 top-4 z-[80] flex w-[min(92vw,380px)] flex-col gap-2">
        {items.map((t) => (
          <div key={t.id} className={cn("pointer-events-auto flex animate-pop items-start gap-3 rounded-xl border bg-white p-3.5 shadow-xl", t.type === "success" ? "border-emerald-200" : "border-red-200")}>
            {t.type === "success" ? <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-500" /> : <AlertCircle className="mt-0.5 h-5 w-5 text-red-500" />}
            <p className="text-sm text-slate-700">{t.msg}</p>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export function ScoreBar({ label: l, value, max = 10 }: { label: string; value: number | null; max?: number }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs"><span className="text-slate-600">{l}</span><span className="font-semibold text-navy">{value ?? "–"}/{max}</span></div>
      <ProgressBar value={value ?? 0} max={max} />
    </div>
  );
}
