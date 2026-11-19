export default function Logo({ light = false, small = false, collapsed = false }: { light?: boolean; small?: boolean; collapsed?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className={`grid shrink-0 place-items-center rounded-xl bg-gradient-to-br from-royal to-plum shadow-lg ${small ? "h-9 w-9" : "h-11 w-11"}`}>
        <svg viewBox="0 0 64 64" className={small ? "h-5 w-5" : "h-6 w-6"}><path d="M18 46V18h7l12 18V18h7v28h-7L25 28v18z" fill="#fff" /><circle cx="48" cy="18" r="4" fill="#00A6FF" /></svg>
      </div>
      {!collapsed && (
        <div className="leading-tight">
          <p className={`font-display text-lg font-bold ${light ? "text-white" : "text-navy"}`}>NI<span className="text-electric">SE</span> <span className="font-semibold">2026</span></p>
          {!small && <p className={`text-[10px] font-medium uppercase tracking-[.18em] ${light ? "text-blue-200" : "text-slate-400"}`}>National Conference</p>}
        </div>
      )}
    </div>
  );
}
