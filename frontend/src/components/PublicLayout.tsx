import { ChevronDown, Menu, X, MapPin, Mail, Phone } from "lucide-react";
import { createContext, useContext, useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { useFetch } from "../lib/hooks";
import { SiteData } from "../lib/types";
import Logo from "./Logo";
import { cn, PageLoader, ErrorBox } from "./ui";

const SiteCtx = createContext<SiteData>(null as any);
export const useSite = () => useContext(SiteCtx);

const LINKS = [
  ["/", "Home"], ["/about", "About"], ["/institution", "Institution"], ["/objectives", "Objectives"], ["/tracks", "Tracks"],
  ["/committees", "Committees"], ["/dates", "Dates"], ["/registration", "Registration"], ["/guidelines", "Guidelines"], ["/contact", "Contact"],
];

export default function PublicLayout() {
  const { data, error, reload } = useFetch<SiteData>("/public/site", { poll: 60000 });
  const [open, setOpen] = useState(false);
  const [login, setLogin] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const loc = useLocation();
  useEffect(() => { setOpen(false); setLogin(false); window.scrollTo(0, 0); }, [loc.pathname]);
  useEffect(() => { const f = () => setScrolled(window.scrollY > 20); f(); window.addEventListener("scroll", f); return () => window.removeEventListener("scroll", f); }, []);

  if (error && !data) return <div className="mx-auto max-w-lg p-10"><ErrorBox message={error} retry={reload} /></div>;
  if (!data) return <PageLoader />;
  const s = data.settings;
  const onHome = loc.pathname === "/";

  return (
    <SiteCtx.Provider value={data}>
      <header className={cn("fixed inset-x-0 top-0 z-50 transition-all duration-300", scrolled || !onHome ? "bg-white/85 shadow-soft backdrop-blur-xl" : "bg-transparent")}>
        <div className="section flex h-[72px] items-center justify-between">
          <Link to="/"><Logo light={!scrolled && onHome} /></Link>
          <nav className="hidden items-center gap-0.5 xl:flex">
            {LINKS.map(([to, l]) => (
              <NavLink key={to} to={to} end className={({ isActive }) => cn("rounded-lg px-3 py-2 text-sm font-medium transition",
                scrolled || !onHome ? "text-slate-600 hover:bg-blue-50 hover:text-royal" : "text-white/85 hover:bg-white/10 hover:text-white", isActive && (scrolled || !onHome ? "bg-blue-50 text-royal" : "bg-white/15 text-white"))}>{l}</NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <div className="relative hidden sm:block">
              <button onClick={() => setLogin((v) => !v)} className={cn("btn btn-sm", scrolled || !onHome ? "btn-secondary" : "btn-outline")}>Sign in <ChevronDown className="h-3.5 w-3.5" /></button>
              {login && (<><div className="fixed inset-0" onClick={() => setLogin(false)} />
                <div className="absolute right-0 mt-2 w-56 animate-pop overflow-hidden rounded-2xl border border-slate-200 bg-white p-1.5 shadow-2xl">
                  {[["/author/login", "Author portal", "Submit & track papers"], ["/reviewer/login", "Reviewer portal", "Evaluate assigned papers"], ["/admin/login", "Admin console", "Organising committee"]].map(([to, t, d]) => (
                    <Link key={to} to={to} className="block rounded-xl px-3 py-2.5 hover:bg-blue-50"><span className="block text-sm font-semibold text-navy">{t}</span><span className="text-xs text-slate-500">{d}</span></Link>))}
                </div></>)}
            </div>
            <Link to="/author/login" state={{ signup: true }} className="btn btn-sm btn-primary hidden sm:inline-flex">Submit Paper</Link>
            <button className={cn("rounded-lg p-2 xl:hidden", scrolled || !onHome ? "text-navy" : "text-white")} onClick={() => setOpen(!open)} aria-label="Menu">{open ? <X /> : <Menu />}</button>
          </div>
        </div>
        {open && (
          <div className="border-t border-slate-100 bg-white p-4 shadow-xl xl:hidden">
            <div className="grid grid-cols-2 gap-1">{LINKS.map(([to, l]) => <NavLink key={to} to={to} end className={({ isActive }) => cn("rounded-lg px-3 py-2.5 text-sm font-medium", isActive ? "bg-blue-50 text-royal" : "text-slate-600")}>{l}</NavLink>)}</div>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              <Link to="/author/login" className="btn btn-primary btn-sm">Author</Link><Link to="/reviewer/login" className="btn btn-secondary btn-sm">Reviewer</Link><Link to="/admin/login" className="btn btn-secondary btn-sm">Admin</Link>
            </div>
          </div>
        )}
      </header>
      <main className={onHome ? "" : "pt-[72px]"}><Outlet /></main>
      <footer className="relative overflow-hidden bg-navy-950 text-blue-100">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-plum/30 blur-3xl" />
        <div className="section relative grid gap-10 py-14 md:grid-cols-4">
          <div className="md:col-span-2"><Logo light />
            <p className="mt-4 max-w-md text-sm text-blue-200/80">{s.full_name}. {s.subtitle} organised by the {s.organizer}, {s.institution_name}.</p></div>
          <div><p className="mb-3 font-display font-semibold text-white">Explore</p>
            <ul className="space-y-2 text-sm">{LINKS.slice(1, 6).map(([to, l]) => <li key={to}><Link className="hover:text-electric" to={to}>{l}</Link></li>)}</ul></div>
          <div><p className="mb-3 font-display font-semibold text-white">Contact</p>
            <ul className="space-y-2.5 text-sm">
              <li className="flex gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-electric" />{s.contact_address || s.venue}</li>
              {s.contact_email && <li className="flex gap-2"><Mail className="h-4 w-4 text-electric" />{s.contact_email}</li>}
              {s.contact_phone && <li className="flex gap-2"><Phone className="h-4 w-4 text-electric" />{s.contact_phone}</li>}
            </ul></div>
        </div>
        <div className="relative border-t border-white/10 py-5 text-center text-xs text-blue-300/70">© 2026 {s.conference_name} · {s.institution_name}. All rights reserved.</div>
      </footer>
    </SiteCtx.Provider>
  );
}
