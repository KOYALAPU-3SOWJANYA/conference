import { AlertTriangle, Calendar, CheckCircle2, Clock, Globe, Mail, MapPin, Phone, Search, Send, Sparkles, UserRound, XCircle } from "lucide-react";
import { FormEvent, ReactNode, useState } from "react";
import { Link } from "react-router-dom";
import { Button, Card, Field, Input, Select, Textarea, useToast } from "../../components/ui";
import { useSite } from "../../components/PublicLayout";
import { api } from "../../lib/api";
import { dateRange, fmtDate } from "../../lib/format";
import { ICONS } from "./Home";

function Hero({ eyebrow, title, text }: { eyebrow: string; title: string; text?: string }) {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-navy via-royal to-plum py-16 text-white md:py-20">
      <div className="grid-bg absolute inset-0 opacity-70" /><div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-electric/30 blur-3xl" />
      <div className="section relative animate-fadeUp"><p className="text-sm font-semibold uppercase tracking-widest text-electric-300">{eyebrow}</p>
        <h1 className="mt-2 text-4xl font-bold !text-white md:text-5xl">{title}</h1>{text && <p className="mt-3 max-w-2xl text-blue-100">{text}</p>}</div>
    </section>
  );
}
const Body = ({ children }: { children: ReactNode }) => <section className="section py-14">{children}</section>;

export function About() {
  const { settings: s } = useSite();
  return (<><Hero eyebrow="About the conference" title={`${s.conference_name} · ${s.full_name}`} text={s.tagline} />
    <Body><div className="grid gap-8 lg:grid-cols-3">
      <Card className="p-8 lg:col-span-2"><p className="whitespace-pre-line leading-relaxed text-slate-600">{s.about_conference}</p></Card>
      <Card className="space-y-4 p-6">
        {[[Calendar, "Dates", dateRange(s.start_date, s.end_date)], [MapPin, "Venue", s.venue], [Clock, "Paper deadline", fmtDate(s.submission_deadline, true)]].map(([I, k, v]: any) => (
          <div key={k} className="flex gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-royal"><I className="h-5 w-5" /></div><div><p className="text-xs font-semibold uppercase text-slate-400">{k}</p><p className="font-medium text-navy">{v}</p></div></div>))}
        <Link to="/author/login" state={{ signup: true }} className="btn btn-primary w-full">Submit a paper</Link>
      </Card></div></Body></>);
}

export function Institution() {
  const { settings: s } = useSite();
  return (<><Hero eyebrow="About the institution" title={s.institution_name} text={`${s.organizer} · Madhurawada, Visakhapatnam`} />
    <Body><Card className="mx-auto max-w-5xl overflow-hidden"><img src="/images/campus.jpg" alt="GVPIHLR campus" className="aspect-[16/9] w-full object-cover object-center" />
      <div className="p-8"><div className="mb-6 flex items-center gap-4"><img src="/images/gvp-logo.jpg" alt="Gayatri Vidya Parishad Institute of Higher Learning and Research" className="h-20 w-20 rounded-full object-cover" />
        <div><p className="font-display text-lg font-bold text-navy">Gayatri Vidya Parishad</p><p className="text-sm text-slate-500">Institute of Higher Learning and Research (GVPIHLR)</p></div></div>
      <p className="whitespace-pre-line leading-relaxed text-slate-600">{s.about_institution}</p>
      <div className="mt-6 flex items-center gap-2 text-sm text-slate-500"><MapPin className="h-4 w-4 text-royal" />{s.venue}</div></div></Card></Body></>);
}

export function Objectives() {
  const { settings: s } = useSite();
  return (<><Hero eyebrow="Objectives" title={`What ${s.conference_name} aims to achieve`} />
    <Body><div className="stagger grid gap-5 md:grid-cols-2">{s.objectives.map((o, i) => (
      <Card key={i} className="card-hover flex gap-4 p-6"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-royal to-electric font-display font-bold text-white">{i + 1}</span><p className="pt-1.5 text-slate-700">{o}</p></Card>))}</div></Body></>);
}

export function Tracks() {
  const { tracks } = useSite();
  return (<><Hero eyebrow="Technical tracks" title="Call for papers" text="Select the track that best matches your contribution when you submit." />
    <Body><div className="stagger grid gap-5 md:grid-cols-2 lg:grid-cols-3">{tracks.map((t, i) => { const I = ICONS[t.icon ?? ""] ?? Sparkles; return (
      <Card key={t.id} className="card-hover p-6"><div className="mb-4 flex items-center justify-between"><div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-royal to-plum text-white shadow-lg"><I className="h-6 w-6" /></div><span className="font-display text-sm font-bold text-slate-300">T{String(i + 1).padStart(2, "0")}</span></div>
        <h3 className="text-lg font-semibold">{t.name}</h3><p className="mt-2 text-sm text-slate-500">{t.description}</p></Card>); })}</div></Body></>);
}

export function Committees() {
  const { committees, settings: s } = useSite();
  const groups = [...new Set(committees.map((c) => c.group))];
  return (<><Hero eyebrow="Committees" title={`The people behind ${s.conference_name}`} />
    <Body><div className="space-y-10">{groups.map((g) => (
      <div key={g}><h2 className="mb-4 flex items-center gap-3 text-2xl font-bold"><span className="h-8 w-1.5 rounded-full bg-gradient-to-b from-royal to-plum" />{g}</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{committees.filter((c) => c.group === g).map((m) => (
          <Card key={m.id} className="card-hover flex items-center gap-4 p-5"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-gradient-to-br from-navy to-royal font-display font-bold text-white">{m.name[0]}</span>
            <div className="min-w-0"><p className="truncate font-semibold text-navy">{m.name}</p><p className="truncate text-xs text-slate-500">{[m.designation, m.affiliation].filter(Boolean).join(" · ") || "—"}</p></div></Card>))}</div></div>))}</div></Body></>);
}

export function Dates() {
  const { dates } = useSite();
  return (<><Hero eyebrow="Important dates" title="Mark your calendar" />
    <Body><div className="relative mx-auto max-w-3xl border-l-2 border-blue-200 pl-8">{dates.map((d) => { const past = new Date(d.event_date + "T23:59:59") < new Date(); return (
      <div key={d.id} className="relative mb-8 animate-fadeUp"><span className={`absolute -left-[41px] top-4 h-4 w-4 rounded-full border-4 border-white ${past ? "bg-slate-300" : "bg-royal shadow-glow"}`} />
        <Card className="p-5"><p className="text-xs font-semibold uppercase tracking-wide text-royal">{fmtDate(d.event_date, true)} {past && <span className="ml-2 text-slate-400">· Past</span>}</p>
          <h3 className="mt-1 text-lg font-semibold">{d.label}</h3>{d.note && <p className="text-sm text-slate-500">{d.note}</p>}</Card></div>); })}</div></Body></>);
}

export function Guidelines() {
  const { settings: s } = useSite();
  return (<><Hero eyebrow="Paper submission" title="Submission guidelines" text={`Deadline: ${fmtDate(s.submission_deadline, true)}`} />
    <Body><div className="grid gap-8 lg:grid-cols-3"><Card className="p-8 lg:col-span-2"><ul className="space-y-4">{s.guidelines.map((g, i) => (
      <li key={i} className="flex gap-3"><CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-electric" /><span className="text-slate-700">{g}</span></li>))}</ul></Card>
      <Card className="p-6"><h3 className="text-lg font-semibold">How to submit</h3>
        {s.submission_email && <p className="mt-2 rounded-xl bg-blue-50 p-3 text-xs text-slate-600">Full length papers in <b>IEEE format</b> can also be sent to <b className="text-navy">{s.submission_email}</b>.</p>}
        <ol className="mt-4 space-y-3 text-sm text-slate-600">{["Create an author account", "Open “Submit Paper” in your dashboard", "Fill in details and upload your PDF", "Track review status & feedback live"].map((t, i) => (
          <li key={i} className="flex gap-3"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-royal text-xs font-bold text-white">{i + 1}</span>{t}</li>))}</ol>
        <Link to="/author/login" state={{ signup: true }} className="btn btn-primary mt-6 w-full">{s.submissions_open ? "Start submission" : "Submissions closed"}</Link></Card></div></Body></>);
}

export function Contact() {
  const { settings: s } = useSite();
  const toast = useToast();
  const [f, setF] = useState({ name: "", email: "", subject: "", message: "" });
  const [busy, setBusy] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault(); setBusy(true);
    try { await api.post("/public/contact", f); setF({ name: "", email: "", subject: "", message: "" }); toast("Thanks! Your message has reached the organising team."); }
    catch (err: any) { toast(err.message, "error"); } finally { setBusy(false); }
  };
  const set = (k: string) => (e: any) => setF({ ...f, [k]: e.target.value });
  return (<><Hero eyebrow="Contact" title="Get in touch" text="Questions about submissions, registration or the programme? Write to us." />
    <Body><div className="grid gap-8 lg:grid-cols-5"><Card className="space-y-5 p-6 lg:col-span-2">
      {[[UserRound, "Correspondence", s.contact_person || "—"], [MapPin, "Address", s.contact_address], [Mail, "Email", s.contact_email || "Use the form"], [Mail, "Paper submission email", s.submission_email || "—"], [Phone, "Phone", s.contact_phone || "—"], [Globe, "Conference website", s.website || "—"]].map(([I, k, v]: any) => (
        <div key={k} className="flex gap-3"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-50 text-royal"><I className="h-5 w-5" /></div><div><p className="text-xs font-semibold uppercase text-slate-400">{k}</p><p className="text-sm font-medium text-navy">{v}</p></div></div>))}</Card>
      <Card className="p-6 lg:col-span-3"><form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <Field label="Name"><Input required minLength={2} value={f.name} onChange={set("name")} /></Field><Field label="Email"><Input type="email" required value={f.email} onChange={set("email")} /></Field>
        <Field label="Subject" className="sm:col-span-2"><Input required minLength={3} value={f.subject} onChange={set("subject")} /></Field>
        <Field label="Message" className="sm:col-span-2"><Textarea required minLength={10} rows={5} value={f.message} onChange={set("message")} /></Field>
        <div className="sm:col-span-2"><Button type="submit" loading={busy} icon={<Send className="h-4 w-4" />}>Send message</Button></div></form></Card></div></Body></>);
}

type PaperCheck = { paper_code: string; title: string; status: string; can_pay: boolean; message: string };
const BLANK = { name: "", designation: "", organization: "", address: "", mobile: "", email: "", category: "", paper_code: "", upi_reference: "" };

export function Registration() {
  const { settings: s, dates } = useSite();
  const toast = useToast();
  const last = dates.find((d) => /registration/i.test(d.label));
  const fees = (s.registration_fees ?? []).map((f) => { const [cat, amt] = f.split("|").map((x) => x.trim()); return { cat, amt, n: Number(String(amt).replace(/\D/g, "")) || 0 }; });
  const [f, setF] = useState({ ...BLANK });
  const [paper, setPaper] = useState<PaperCheck | null>(null);
  const [checking, setChecking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ reg_code: string; amount: number } | null>(null);
  const set = (k: string) => (e: any) => {
    setF({ ...f, [k]: e.target.value });
    if (k === "paper_code" || k === "email") setPaper(null);   // any change to ID/e-mail needs a fresh check
  };
  const hasPaper = f.paper_code.trim().length > 0;
  const amount = fees.find((x) => x.cat === f.category)?.n ?? 0;
  const payOpen = hasPaper ? !!paper?.can_pay : true;

  const verify = async () => {
    if (!f.paper_code.trim() || !f.email.trim()) { toast("Enter your e-mail ID and Paper ID first", "error"); return; }
    setChecking(true);
    try { setPaper(await api.post<PaperCheck>("/public/registration/lookup", { paper_code: f.paper_code, email: f.email })); }
    catch (err: any) { setPaper(null); toast(err.message, "error"); } finally { setChecking(false); }
  };
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (hasPaper && !paper?.can_pay) { toast("Verify an accepted Paper ID first", "error"); return; }
    setBusy(true);
    try { setDone(await api.post("/public/registrations", { ...f, paper_code: f.paper_code.trim() || null })); setF({ ...BLANK }); setPaper(null); }
    catch (err: any) { toast(err.message, "error"); } finally { setBusy(false); }
  };

  return (<><Hero eyebrow="Registration" title={`${s.conference_name} registration`} text={last ? `Last date of registration: ${fmtDate(last.event_date, true)}` : undefined} />
    <Body><div className="grid gap-8 lg:grid-cols-3">
      <div className="space-y-8 lg:col-span-2">
        <Card className="overflow-hidden"><div className="border-b border-slate-100 px-6 py-4"><h3 className="text-lg font-semibold">Registration fees</h3></div>
          <table className="w-full text-sm"><tbody>{fees.map((x) => (<tr key={x.cat} className="border-b border-slate-100 last:border-0"><td className="px-6 py-3.5 font-medium text-slate-700">{x.cat}</td><td className="px-6 py-3.5 text-right font-display text-lg font-bold text-navy">{x.amt}</td></tr>))}</tbody></table></Card>

        {done ? (
          <Card className="p-8 text-center"><CheckCircle2 className="mx-auto h-14 w-14 text-emerald-500" />
            <h3 className="mt-4 text-2xl font-bold">Registration received</h3>
            <p className="mt-2 text-slate-600">Your registration ID is <b className="text-navy">{done.reg_code}</b>. Amount paid: <b className="text-navy">Rs. {done.amount}</b>.</p>
            <p className="mt-1 text-sm text-slate-500">The organisers will verify your UPI payment. Keep your registration ID for reference.</p>
            <Button className="mt-6" variant="secondary" onClick={() => setDone(null)}>Register another person</Button></Card>
        ) : (
        <Card className="p-6 sm:p-8"><h3 className="text-lg font-semibold">Registration form</h3>
          <p className="mt-1 text-sm text-slate-500">Presenting a paper? Enter your Paper ID and verify it. Payment opens only for <b>accepted</b> papers.</p>
          <form onSubmit={submit} className="mt-6 grid gap-4 sm:grid-cols-2">
            <Field label="Name"><Input required minLength={2} value={f.name} onChange={set("name")} /></Field>
            <Field label="Designation"><Input required value={f.designation} onChange={set("designation")} /></Field>
            <Field label="Organization" className="sm:col-span-2"><Input required value={f.organization} onChange={set("organization")} /></Field>
            <Field label="Address" className="sm:col-span-2"><Textarea required minLength={5} rows={3} value={f.address} onChange={set("address")} /></Field>
            <Field label="Mobile No"><Input required type="tel" value={f.mobile} onChange={set("mobile")} /></Field>
            <Field label="E-mail ID" hint="Paper authors: use the e-mail of your author account"><Input required type="email" value={f.email} onChange={set("email")} /></Field>
            <Field label="Registration category"><Select required value={f.category} onChange={set("category")}><option value="">Select category</option>{fees.map((x) => <option key={x.cat} value={x.cat}>{x.cat} – {x.amt}</option>)}</Select></Field>

            <div className="sm:col-span-2 rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
              <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
                <Field label="Paper ID" hint="Leave empty if you are attending without a paper"><Input placeholder="e.g. RAiSE26-0001" value={f.paper_code} onChange={set("paper_code")} /></Field>
                <Button type="button" variant="secondary" loading={checking} disabled={!hasPaper} icon={<Search className="h-4 w-4" />} onClick={verify}>Verify paper</Button>
              </div>
              <Field label="Paper title" className="mt-4"><Input readOnly value={paper?.title ?? ""} placeholder={hasPaper ? "Filled automatically after verification" : "Not applicable"} className="bg-slate-100" /></Field>
              {paper && (paper.can_pay
                ? <p className="mt-3 flex items-start gap-2 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />{paper.message}</p>
                : <p className={`mt-3 flex items-start gap-2 rounded-xl p-3 text-sm ${paper.status === "rejected" ? "bg-red-50 text-red-800" : "bg-amber-50 text-amber-800"}`}>
                    {paper.status === "rejected" ? <XCircle className="mt-0.5 h-4 w-4 shrink-0" /> : <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />}{paper.message}</p>)}
            </div>

            <div className="sm:col-span-2">
              <h4 className="font-semibold text-navy">Payment</h4>
              {!payOpen ? (
                <p className="mt-2 rounded-xl bg-slate-100 p-4 text-sm text-slate-600">{hasPaper && !paper ? "Verify your Paper ID to continue to payment." : "Payment is not available for this paper."}</p>
              ) : (
                <div className="mt-3 grid gap-6 sm:grid-cols-[auto_1fr] sm:items-center">
                  <div className="text-center"><img src="/images/payment-qr.png" alt="UPI payment QR code – GVP College of Engineering for Women" className="mx-auto w-52 rounded-xl border border-slate-100" /><p className="mt-1 text-xs text-slate-500">Scan to pay the registration fee</p></div>
                  <div className="space-y-4">
                    <p className="text-sm text-slate-600">Amount to pay: <b className="font-display text-xl text-navy">{f.category ? `Rs. ${amount}` : "select a category"}</b></p>
                    <Field label="UPI Reference Number" hint="Enter the reference/UTR number shown after your payment"><Input required minLength={6} value={f.upi_reference} onChange={set("upi_reference")} /></Field>
                  </div>
                </div>)}
            </div>
            <div className="sm:col-span-2"><Button type="submit" size="lg" loading={busy} disabled={!payOpen || !f.category} icon={<Send className="h-4 w-4" />}>Submit registration</Button></div>
          </form></Card>)}
      </div>
      <div className="space-y-8">
        <Card className="space-y-4 p-6"><h3 className="text-lg font-semibold">Correspondence</h3>
          {[[UserRound, s.contact_person], [MapPin, s.contact_address], [Mail, s.contact_email], [Phone, s.contact_phone]].filter(([, v]: any) => v).map(([I, v]: any, i) => (
            <div key={i} className="flex gap-3 text-sm"><I className="mt-0.5 h-4 w-4 shrink-0 text-royal" /><span className="text-slate-600">{v}</span></div>))}</Card>
        <Card className="p-6 text-sm text-slate-600"><h3 className="text-lg font-semibold text-navy">Who can pay?</h3>
          <ul className="mt-3 space-y-2"><li><b className="text-emerald-700">Accepted paper</b> – payment opens after Paper ID verification.</li><li><b className="text-amber-700">Under review / revision</b> – wait for acceptance.</li><li><b className="text-red-700">Rejected paper</b> – no payment.</li><li><b>No paper</b> – attendees can register and pay directly.</li></ul></Card>
      </div></div></Body></>);
}
