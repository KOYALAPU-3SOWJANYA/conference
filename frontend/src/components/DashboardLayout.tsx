import { Bell, ChevronsLeft, ChevronsRight, LogOut, Menu, X } from "lucide-react";
import { ComponentType, CSSProperties, useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { timeAgo } from "../lib/format";
import { useFetch } from "../lib/hooks";
import { api } from "../lib/api";
import { Notice, Role } from "../lib/types";
import Logo from "./Logo";
import { cn } from "./ui";

export interface NavItem { to: string; label: string; icon: ComponentType<{ className?: string }>; end?: boolean }

const THEMES: Record<Role, {
  title: string; vars: Record<string, string>; side: string; item: string; active: string; muted: string; content: string; top: string; avatar: string;
}> = {
  admin: {
    title: "Admin Console", vars: { "--a1": "#082D72", "--a2": "#0757C8", "--a-soft": "#e3ecfb" },
    side: "bg-gradient-to-b from-navy-950 via-navy to-navy-700 text-blue-100 border-r border-white/10",
    item: "hover:bg-white/10 hover:text-white", active: "bg-white/15 text-white shadow-lg ring-1 ring-white/20",
    muted: "text-blue-300/70", content: "bg-gradient-to-br from-[#EEF3FB] to-[#E4ECF9]", top: "bg-white/80", avatar: "from-electric to-royal",
  },
  author: {
    title: "Author Portal", vars: { "--a1": "#0757C8", "--a2": "#00A6FF", "--a-soft": "#e1f1ff" },
    side: "bg-white text-slate-600 border-r border-slate-200",
    item: "hover:bg-blue-50 hover:text-royal", active: "text-white shadow-lg shadow-royal/30 bg-gradient-to-r from-royal to-electric",
    muted: "text-slate-400", content: "bg-gradient-to-br from-[#F4F9FF] to-[#E9F5FF]", top: "bg-white/80", avatar: "from-royal to-electric",
  },
  reviewer: {
    title: "Reviewer Workspace", vars: { "--a1": "#7900A8", "--a2": "#b04bdc", "--a-soft": "#f3e6fa" },
    side: "bg-gradient-to-b from-plum-900 via-plum-700 to-plum text-purple-100 border-r border-white/10",
    item: "hover:bg-white/10 hover:text-white", active: "bg-white/15 text-white shadow-lg ring-1 ring-white/25",
    muted: "text-purple-300/70", content: "bg-gradient-to-br from-[#FAF5FF] to-[#F1ECFB]", top: "bg-white/80", avatar: "from-plum to-fuchsia-400",
  },
};

export default function DashboardLayout({ role, nav }: { role: Role; nav: NavItem[] }) {
  const t = THEMES[role];
  const { user, logout } = useAuth();
  const nv = useNavigate();
  const loc = useLocation();
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem("raise_side") === "1");
  const [mobile, setMobile] = useState(false);
  const [bell, setBell] = useState(false);
  const notices = useFetch<{ unread: number; items: Notice[] }>("/notifications", { poll: 8000 });

  useEffect(() => { setMobile(false); setBell(false); window.scrollTo(0, 0); }, [loc.pathname]);
  const toggle = () => setCollapsed((c) => { localStorage.setItem("raise_side", c ? "0" : "1"); return !c; });
  const current = [...nav].sort((a, b) => b.to.length - a.to.length).find((n) => loc.pathname === n.to || loc.pathname.startsWith(n.to + "/"));
  const unread = notices.data?.unread ?? 0;

  const openNotice = async (n: Notice) => {
    if (!n.is_read) { await api.post(`/notifications/${n.id}/read`).catch(() => {}); notices.reload(); }
    setBell(false); if (n.link) nv(n.link);
  };
  const markAll = async () => { await api.post("/notifications/read-all"); notices.reload(); };

  return (
    <div style={t.vars as CSSProperties} className={cn("flex min-h-screen", t.content)}>
      {mobile && <div className="fixed inset-0 z-30 bg-navy-950/50 backdrop-blur-sm lg:hidden" onClick={() => setMobile(false)} />}
      <aside className={cn("fixed inset-y-0 left-0 z-40 flex w-72 flex-col transition-all duration-300 lg:sticky lg:top-0 lg:h-screen", t.side,
        mobile ? "translate-x-0" : "-translate-x-full lg:translate-x-0", collapsed ? "lg:w-[84px]" : "lg:w-72")}>
        <div className={cn("flex h-16 items-center border-b px-5", role === "author" ? "border-slate-100" : "border-white/10", collapsed && "lg:justify-center lg:px-0")}>
          <Link to="/"><Logo light={role !== "author"} collapsed={collapsed} /></Link>
          <button className="ml-auto lg:hidden" onClick={() => setMobile(false)} aria-label="Close menu"><X className="h-5 w-5" /></button>
        </div>
        <div className={cn("px-5 pb-2 pt-5 text-[11px] font-semibold uppercase tracking-widest", t.muted, collapsed && "lg:hidden")}>{t.title}</div>
        <nav className={cn("flex-1 space-y-1 overflow-y-auto px-3 pb-4", collapsed && "lg:pt-4")}>
          {nav.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end} title={n.label}
              className={({ isActive }) => cn("group flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all", t.item, isActive && t.active, collapsed && "lg:justify-center lg:px-0")}>
              <n.icon className="h-[18px] w-[18px] shrink-0" />
              <span className={cn(collapsed && "lg:hidden")}>{n.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className={cn("border-t p-3", role === "author" ? "border-slate-100" : "border-white/10")}>
          <button onClick={toggle} className={cn("hidden w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm lg:flex", t.item, collapsed && "justify-center px-0")}>
            {collapsed ? <ChevronsRight className="h-[18px] w-[18px]" /> : <><ChevronsLeft className="h-[18px] w-[18px]" />Collapse</>}
          </button>
          <button onClick={() => { logout(); nv(`/${role}/login`); }} className={cn("flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm", t.item, collapsed && "lg:justify-center lg:px-0")}>
            <LogOut className="h-[18px] w-[18px]" /><span className={cn(collapsed && "lg:hidden")}>Sign out</span>
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className={cn("sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-slate-200/70 px-4 backdrop-blur-xl md:px-8", t.top)}>
          <button className="rounded-lg p-2 hover:bg-slate-100 lg:hidden" onClick={() => setMobile(true)} aria-label="Open menu"><Menu className="h-5 w-5" /></button>
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-lg font-semibold text-navy">{current?.label ?? "Dashboard"}</p>
          </div>
          <div className="relative">
            <button onClick={() => setBell((b) => !b)} className="relative rounded-xl border border-slate-200 bg-white p-2.5 text-slate-600 shadow-sm hover:text-navy" aria-label="Notifications">
              <Bell className="h-5 w-5" />
              {unread > 0 && <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">{unread > 9 ? "9+" : unread}</span>}
            </button>
            {bell && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setBell(false)} />
                <div className="absolute right-0 z-40 mt-2 w-[min(92vw,380px)] animate-pop overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
                  <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                    <p className="font-display font-semibold text-navy">Notifications</p>
                    {unread > 0 && <button onClick={markAll} className="text-xs font-semibold" style={{ color: "var(--a1)" }}>Mark all read</button>}
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {!notices.data?.items.length && <p className="px-4 py-8 text-center text-sm text-slate-400">You're all caught up.</p>}
                    {notices.data?.items.slice(0, 8).map((n) => (
                      <button key={n.id} onClick={() => openNotice(n)} className={cn("flex w-full gap-3 border-b border-slate-50 px-4 py-3 text-left hover:bg-slate-50", !n.is_read && "bg-[color:var(--a-soft)]")}>
                        <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", n.is_read ? "bg-transparent" : "bg-red-500")} />
                        <span className="min-w-0"><span className="block truncate text-sm font-semibold text-navy">{n.title}</span>
                          <span className="line-clamp-2 text-xs text-slate-500">{n.message}</span>
                          <span className="mt-0.5 block text-[11px] text-slate-400">{timeAgo(n.created_at)}</span></span>
                      </button>
                    ))}
                  </div>
                  <Link to={`/${role}/notifications`} className="block border-t border-slate-100 py-2.5 text-center text-sm font-semibold" style={{ color: "var(--a1)" }}>View all</Link>
                </div>
              </>
            )}
          </div>
          <Link to={`/${role}/profile`} className="flex items-center gap-3 rounded-xl py-1 pl-1 pr-2 hover:bg-slate-100">
            <span className={cn("grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br font-display text-sm font-bold text-white", t.avatar)}>{user?.name?.[0]?.toUpperCase()}</span>
            <span className="hidden text-left leading-tight sm:block"><span className="block max-w-[160px] truncate text-sm font-semibold text-navy">{user?.name}</span><span className="block text-xs capitalize text-slate-400">{role}</span></span>
          </Link>
        </header>
        <main className="flex-1 p-4 md:p-8"><Outlet /></main>
      </div>
    </div>
  );
}
