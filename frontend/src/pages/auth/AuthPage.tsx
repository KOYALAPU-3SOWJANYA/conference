import { ArrowLeft, CheckCircle2, ClipboardCheck, Eye, EyeOff, FileUp, LineChart, LockKeyhole, ShieldCheck, Star, Users } from "lucide-react";
import { CSSProperties, FormEvent, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import Logo from "../../components/Logo";
import { Button, cn, Field, Input, Textarea, useToast } from "../../components/ui";
import { useAuth } from "../../lib/auth";
import { Role } from "../../lib/types";

const CFG: Record<Role, { title: string; sub: string; bg: string; vars: Record<string, string>; points: [any, string][]; signup: boolean }> = {
  author: {
    title: "Author Portal", sub: "Submit your research and follow every step of peer review.",
    bg: "from-royal via-[#0a6be0] to-electric", vars: { "--a1": "#0757C8", "--a2": "#00A6FF", "--a-soft": "#e1f1ff" }, signup: true,
    points: [[FileUp, "Upload PDF papers & revisions"], [LineChart, "Live status tracking"], [ClipboardCheck, "Receive reviewer feedback"]],
  },
  reviewer: {
    title: "Reviewer Workspace", sub: "Evaluate assigned papers with structured, fair scoring.",
    bg: "from-plum-900 via-plum-700 to-plum", vars: { "--a1": "#7900A8", "--a2": "#b04bdc", "--a-soft": "#f3e6fa" }, signup: true,
    points: [[LockKeyhole, "Secure access to assigned PDFs only"], [Star, "Structured scoring criteria"], [Users, "Double-blind review"]],
  },
  admin: {
    title: "Admin Console", sub: "Run the conference: assign reviewers, monitor progress, decide.",
    bg: "from-navy-950 via-navy to-navy-700", vars: { "--a1": "#082D72", "--a2": "#0757C8", "--a-soft": "#e3ecfb" }, signup: true,
    points: [[ShieldCheck, "Role-based secure access"], [LineChart, "Analytics & review progress"], [CheckCircle2, "Final decision authority"]],
  },
};

export default function AuthPage({ role }: { role: Role }) {
  const c = CFG[role];
  const { user, login, register } = useAuth();
  const nv = useNavigate();
  const loc = useLocation() as any;
  const toast = useToast();
  const [mode, setMode] = useState<"login" | "signup">(loc.state?.signup ? "signup" : "login");
  const [busy, setBusy] = useState(false);
  const [show, setShow] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [f, setF] = useState<Record<string, string>>({ name: "", email: "", password: "", phone: "", affiliation: "", designation: "", expertise: "", invite_code: "" });
  const set = (k: string) => (e: any) => setF({ ...f, [k]: e.target.value });

  if (user && user.role === role) return <Navigate to={`/${role}`} replace />;

  const submit = async (e: FormEvent) => {
    e.preventDefault(); setBusy(true);
    try {
      if (mode === "login") { await login(role, f.email, f.password); nv(loc.state?.from?.startsWith(`/${role}`) ? loc.state.from : `/${role}`); }
      else {
        const payload: Record<string, any> = { name: f.name, email: f.email, password: f.password, phone: f.phone || null, affiliation: f.affiliation || null, designation: f.designation || null };
        if (role === "reviewer") payload.expertise = f.expertise;
        if (role === "admin") payload.invite_code = f.invite_code;
        const r = await register(role, payload);
        if (r.pending) setDone(r.message ?? "Registration received."); else nv(`/${role}`);
      }
    } catch (err: any) { toast(err.message, "error"); } finally { setBusy(false); }
  };

  return (
    <div style={c.vars as CSSProperties} className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      <div className={cn("relative hidden overflow-hidden bg-gradient-to-br p-12 text-white lg:flex lg:flex-col lg:justify-between", c.bg)}>
        <div className="grid-bg absolute inset-0 opacity-60" /><div className="absolute -right-16 top-1/3 h-80 w-80 animate-float rounded-full bg-white/15 blur-3xl" />
        <Link to="/" className="relative"><Logo light /></Link>
        <div className="relative max-w-md">
          <h1 className="text-4xl font-bold !text-white">{c.title}</h1><p className="mt-3 text-lg text-white/80">{c.sub}</p>
          <ul className="mt-8 space-y-3">{c.points.map(([I, t]) => <li key={t} className="glass flex items-center gap-3 px-4 py-3"><I className="h-5 w-5 text-white" /><span className="text-sm font-medium">{t}</span></li>)}</ul>
        </div>
        <p className="relative text-xs text-white/60">NISE 2026 · Intelligent Systems and Emerging Technologies</p>
      </div>

      <div className="relative flex items-center justify-center bg-gradient-to-br from-white to-mist p-6 sm:p-10">
        <Link to="/" className="absolute left-6 top-6 flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-navy"><ArrowLeft className="h-4 w-4" />Back to website</Link>
        <div className="w-full max-w-md animate-fadeUp">
          <div className="mb-6 lg:hidden"><Logo /></div>
          {done ? (
            <div className="card p-8 text-center"><div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-emerald-50 text-emerald-600"><CheckCircle2 className="h-8 w-8" /></div>
              <h2 className="text-2xl font-bold">Almost there</h2><p className="mt-2 text-slate-600">{done}</p>
              <Button className="mt-6" onClick={() => { setDone(null); setMode("login"); }}>Back to sign in</Button></div>
          ) : (
            <div className="card p-7 shadow-xl sm:p-8">
              <h2 className="text-2xl font-bold">{mode === "login" ? "Welcome back" : `Create ${role} account`}</h2>
              <p className="mt-1 text-sm text-slate-500">{c.title} · {mode === "login" ? "sign in to continue" : "it only takes a minute"}</p>
              <div className="mt-6 grid grid-cols-2 rounded-xl bg-slate-100 p-1">
                {(["login", "signup"] as const).map((m) => <button key={m} type="button" onClick={() => setMode(m)} className={cn("rounded-lg py-2 text-sm font-semibold transition", mode === m ? "bg-white text-navy shadow" : "text-slate-500")}>{m === "login" ? "Sign in" : "Sign up"}</button>)}
              </div>
              <form onSubmit={submit} className="mt-6 space-y-4">
                {mode === "signup" && <Field label="Full name"><Input required minLength={2} value={f.name} onChange={set("name")} autoComplete="name" /></Field>}
                <Field label="Email"><Input type="email" required value={f.email} onChange={set("email")} autoComplete="email" /></Field>
                <Field label="Password" hint={mode === "signup" ? "At least 8 characters with letters and numbers" : undefined}>
                  <div className="relative"><Input type={show ? "text" : "password"} required minLength={mode === "signup" ? 8 : 1} value={f.password} onChange={set("password")} autoComplete={mode === "login" ? "current-password" : "new-password"} className="pr-11" />
                    <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600" aria-label="Toggle password">{show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div>
                </Field>
                {mode === "signup" && (<>
                  {role !== "admin" && <div className="grid gap-4 sm:grid-cols-2"><Field label="Phone"><Input value={f.phone} onChange={set("phone")} /></Field><Field label="Designation"><Input value={f.designation} onChange={set("designation")} /></Field></div>}
                  {role !== "admin" && <Field label="Affiliation"><Input required={role === "reviewer"} value={f.affiliation} onChange={set("affiliation")} placeholder="Institution / organisation" /></Field>}
                  {role === "reviewer" && <><Field label="Areas of expertise"><Textarea required rows={3} value={f.expertise} onChange={set("expertise")} placeholder="e.g. machine learning, cyber security" /></Field>
                    <p className="rounded-xl bg-plum-100 px-3 py-2 text-xs text-plum-700">Reviewer accounts are activated after approval by the organising committee.</p></>}
                  {role === "admin" && <Field label="Admin invite code" hint="Provided by the system administrator"><Input required type="password" value={f.invite_code} onChange={set("invite_code")} /></Field>}
                </>)}
                <Button type="submit" size="lg" loading={busy} className="w-full">{mode === "login" ? "Sign in" : "Create account"}</Button>
              </form>
              <p className="mt-5 text-center text-xs text-slate-400">Looking for a different portal?{" "}
                {(["author", "reviewer", "admin"] as Role[]).filter((r) => r !== role).map((r, i) => <span key={r}>{i > 0 && " · "}<Link className="font-semibold capitalize text-royal hover:underline" to={`/${r}/login`}>{r}</Link></span>)}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
