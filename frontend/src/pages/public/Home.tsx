import { ArrowRight, Brain, Calendar, CheckCircle2, Cloud, Cpu, Database, FileText, FlaskConical, Heart, Leaf, MapPin, ShieldCheck, Sparkles, UserCheck, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { useSite } from "../../components/PublicLayout";
import { useCountdown } from "../../lib/hooks";
import { dateRange, fmtDate } from "../../lib/format";

export const ICONS: Record<string, any> = { brain: Brain, database: Database, shield: ShieldCheck, cpu: Cpu, cloud: Cloud, heart: Heart, leaf: Leaf, flask: FlaskConical };

export default function Home() {
  const { settings: s, tracks, dates } = useSite();
  const cd = useCountdown(s.start_date);
  const upcoming = dates.filter((d) => new Date(d.event_date + "T23:59:59") >= new Date()).slice(0, 4);
  return (
    <>
      <section className="relative overflow-hidden bg-gradient-to-br from-navy-950 via-navy to-plum-700 pb-24 pt-36 text-white">
        <div className="grid-bg absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]" />
        <div className="absolute -left-24 top-20 h-96 w-96 animate-float rounded-full bg-electric/30 blur-3xl" />
        <div className="absolute -right-24 bottom-0 h-[28rem] w-[28rem] animate-float rounded-full bg-plum/50 blur-3xl [animation-delay:2s]" />
        <div className="section relative grid items-center gap-12 lg:grid-cols-[1.25fr_1fr]">
          <div className="animate-fadeUp">
            <span className="glass inline-flex items-center gap-2 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-electric-300"><Sparkles className="h-3.5 w-3.5" />{s.subtitle} · {dateRange(s.start_date, s.end_date)}</span>
            <h1 className="mt-6 font-display text-5xl font-extrabold leading-[1.05] text-white md:text-7xl">NI<span className="gradient-text">SE</span> 2026</h1>
            <p className="mt-3 font-display text-2xl font-semibold text-blue-100 md:text-3xl">{s.full_name}</p>
            <p className="mt-5 max-w-xl text-lg text-blue-100/80">{s.tagline}. Organised by the {s.organizer}, {s.institution_name}.</p>
            <p className="mt-2 max-w-xl text-sm text-blue-100/70">{s.publication_note}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/author/login" state={{ signup: true }} className="btn btn-lg bg-white text-navy shadow-glow hover:-translate-y-0.5">Submit your paper <ArrowRight className="h-4 w-4" /></Link>
              <Link to="/guidelines" className="btn btn-lg btn-outline">Submission guidelines</Link>
            </div>
            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-blue-100/90">
              <span className="flex items-center gap-2"><MapPin className="h-4 w-4 text-electric" />{s.venue}</span>
              <span className="flex items-center gap-2"><Calendar className="h-4 w-4 text-electric" />Paper deadline: {fmtDate(s.submission_deadline, true)}</span>
            </div>
          </div>
          <div className="glass animate-fadeUp p-6 shadow-2xl [animation-delay:.15s]">
            <p className="text-center text-xs font-semibold uppercase tracking-[.2em] text-electric-300">{cd?.over ? "Conference is live" : "Conference begins in"}</p>
            <div className="mt-4 grid grid-cols-4 gap-3 text-center">
              {(["days", "hours", "minutes", "seconds"] as const).map((k) => (
                <div key={k} className="rounded-xl bg-white/10 py-4"><p className="font-display text-3xl font-bold tabular-nums">{String(cd?.[k] ?? 0).padStart(2, "0")}</p><p className="text-[10px] uppercase tracking-widest text-blue-200">{k}</p></div>))}
            </div>
            <div className="mt-5 space-y-2 text-sm">
              {upcoming.map((d) => <div key={d.id} className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2"><span className="text-blue-100">{d.label}</span><span className="font-semibold text-white">{fmtDate(d.event_date)}</span></div>)}
            </div>
          </div>
        </div>
      </section>

      <section className="section -mt-10 grid gap-5 md:grid-cols-3 relative z-10">
        {[{ i: UserCheck, t: "Authors", d: "Register, submit PDFs, track status and respond to reviewer feedback.", to: "/author/login", c: "from-royal to-electric" },
          { i: Users, t: "Reviewers", d: "Evaluate assigned papers with structured scoring and detailed comments.", to: "/reviewer/login", c: "from-plum to-fuchsia-500" },
          { i: FileText, t: "Organisers", d: "Assign reviewers, monitor progress and make the final decisions.", to: "/admin/login", c: "from-navy to-royal" }].map((x) => (
          <Link key={x.t} to={x.to} className="card card-hover group p-6">
            <div className={`mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br text-white shadow-lg ${x.c}`}><x.i className="h-6 w-6" /></div>
            <h3 className="text-lg font-semibold">{x.t}</h3><p className="mt-1 text-sm text-slate-500">{x.d}</p>
            <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-royal">Open portal <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" /></span>
          </Link>))}
      </section>

      <section className="section py-20">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div><p className="text-sm font-semibold uppercase tracking-widest text-royal">About the conference</p>
            <h2 className="mt-2 text-3xl font-bold md:text-4xl">Advancing intelligent systems and emerging technologies, together</h2>
            <p className="mt-4 leading-relaxed text-slate-600">{s.about_conference}</p>
            <Link to="/about" className="btn btn-primary mt-6">Learn more <ArrowRight className="h-4 w-4" /></Link></div>
          <ul className="grid gap-3 sm:grid-cols-2">
            {s.objectives.slice(0, 4).map((o, i) => <li key={i} className="card flex gap-3 p-4 text-sm"><CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-electric" />{o}</li>)}
          </ul>
        </div>
      </section>

      <section className="bg-gradient-to-b from-white to-mist py-20">
        <div className="section">
          <div className="mx-auto max-w-2xl text-center"><p className="text-sm font-semibold uppercase tracking-widest text-royal">Technical tracks</p><h2 className="mt-2 text-3xl font-bold md:text-4xl">Find the right home for your research</h2></div>
          <div className="stagger mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {tracks.slice(0, 8).map((t) => { const I = ICONS[t.icon ?? ""] ?? Sparkles; return (
              <div key={t.id} className="card card-hover p-5"><div className="mb-3 grid h-11 w-11 place-items-center rounded-xl bg-blue-50 text-royal"><I className="h-5 w-5" /></div>
                <h3 className="text-[15px] font-semibold leading-snug">{t.name}</h3><p className="mt-1.5 line-clamp-3 text-xs text-slate-500">{t.description}</p></div>); })}
          </div>
          <div className="mt-8 text-center"><Link to="/tracks" className="btn btn-secondary">View all tracks</Link></div>
        </div>
      </section>

      <section className="section pb-4 pt-20">
        <div className="mx-auto max-w-2xl text-center"><p className="text-sm font-semibold uppercase tracking-widest text-royal">Registration</p><h2 className="mt-2 text-3xl font-bold md:text-4xl">Registration fees</h2>
          <p className="mt-2 text-sm text-slate-500">Last date of registration: {fmtDate(dates.find((d) => /registration/i.test(d.label))?.event_date ?? s.submission_deadline, true)}</p></div>
        <div className="stagger mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {s.registration_fees.map((f) => { const [cat, amt] = f.split("|").map((x) => x.trim()); return (
            <div key={f} className="card card-hover p-6 text-center"><p className="text-sm font-semibold text-slate-500">{cat}</p><p className="mt-2 font-display text-3xl font-bold text-navy">{amt}</p></div>); })}
        </div>
        <div className="mt-8 text-center"><Link to="/registration" className="btn btn-primary">How to register <ArrowRight className="h-4 w-4" /></Link></div>
      </section>

      <section className="section py-20">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-navy via-royal to-plum p-10 text-center text-white md:p-16">
          <div className="grid-bg absolute inset-0 opacity-60" />
          <div className="relative"><h2 className="text-3xl font-bold !text-white md:text-4xl">Ready to share your research?</h2>
            <p className="mx-auto mt-3 max-w-xl text-blue-100">Submissions close on {fmtDate(s.submission_deadline, true)}. Create an author account and upload your paper in minutes.</p>
            <Link to="/author/login" state={{ signup: true }} className="btn btn-lg mt-7 bg-white text-navy hover:-translate-y-0.5">Create author account <ArrowRight className="h-4 w-4" /></Link></div>
        </div>
      </section>
    </>
  );
}
