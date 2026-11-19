import { ArrowRight, CheckCircle2, Clock, FilePlus2, FileText, RefreshCcw, XCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { Button, Card, CardHeader, Empty, ErrorBox, PageHeader, PageLoader, StatCard, StatusBadge } from "../../components/ui";
import { useAuth } from "../../lib/auth";
import { fmtDate } from "../../lib/format";
import { useFetch } from "../../lib/hooks";
import { Paper } from "../../lib/types";

export default function AuthorOverview() {
  const { user } = useAuth();
  const { data, error, loading, reload } = useFetch<Paper[]>("/author/papers", { poll: 8000 });
  if (error) return <ErrorBox message={error} retry={reload} />;
  if (loading && !data) return <PageLoader />;
  const p = data ?? [];
  const n = (s: string[]) => p.filter((x) => s.includes(x.status)).length;
  const action = p.filter((x) => x.can_revise);
  const stages = [["Submitted", n(["submitted"]), "bg-slate-400"], ["Under review", n(["under_review"]), "bg-amber-400"], ["Revision", n(["minor_revision", "major_revision"]), "bg-cyan-500"], ["Accepted", n(["accepted"]), "bg-emerald-500"], ["Rejected", n(["rejected"]), "bg-red-500"]] as const;
  return (
    <>
      <div className="relative mb-8 overflow-hidden rounded-3xl bg-gradient-to-br from-royal via-[#0a6be0] to-electric p-7 text-white shadow-soft md:p-9 animate-fadeUp">
        <div className="grid-bg absolute inset-0 opacity-50" /><div className="absolute -right-10 -top-10 h-56 w-56 rounded-full bg-white/20 blur-3xl" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div><p className="text-sm text-blue-100">Welcome back,</p><h1 className="text-3xl font-bold !text-white">{user?.name}</h1><p className="mt-1 text-blue-100">Track your submissions and respond to reviewer feedback.</p></div>
          <Link to="/author/submit" className="btn btn-lg bg-white text-navy shadow-glow"><FilePlus2 className="h-5 w-5" />Submit new paper</Link>
        </div>
      </div>
      <div className="stagger grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total submissions" value={p.length} icon={<FileText className="h-5 w-5" />} tone="blue" />
        <StatCard label="Under review" value={n(["submitted", "under_review"])} icon={<Clock className="h-5 w-5" />} tone="amber" />
        <StatCard label="Revision needed" value={n(["minor_revision", "major_revision"])} icon={<RefreshCcw className="h-5 w-5" />} tone="cyan" />
        <StatCard label="Accepted" value={n(["accepted"])} icon={<CheckCircle2 className="h-5 w-5" />} tone="green" />
      </div>
      {action.length > 0 && (
        <Card className="mt-6 border-cyan-200 bg-gradient-to-r from-cyan-50 to-white p-5">
          <p className="font-display font-semibold text-navy">Action required</p>
          <div className="mt-3 space-y-2">{action.map((x) => <Link key={x.id} to={`/author/papers/${x.id}`} className="flex items-center justify-between rounded-xl bg-white px-4 py-3 shadow-sm hover:shadow-md"><span className="text-sm"><b>{x.paper_code}</b> — upload your revised paper</span><ArrowRight className="h-4 w-4 text-royal" /></Link>)}</div>
        </Card>)}
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Recent papers" action={<Link to="/author/papers" className="text-sm font-semibold text-royal">View all</Link>} />
          {!p.length ? <Empty title="No papers yet" text="Submit your first research paper to RAiSE 2026." action={<Link to="/author/submit" className="btn btn-primary">Submit paper</Link>} /> :
            <div className="divide-y divide-slate-100">{p.slice(0, 5).map((x) => (
              <Link key={x.id} to={`/author/papers/${x.id}`} className="flex items-center gap-4 px-5 py-4 hover:bg-blue-50/50">
                <div className="min-w-0 flex-1"><p className="text-xs font-semibold text-royal">{x.paper_code} · v{x.current_version}</p><p className="truncate font-medium text-navy">{x.title}</p><p className="text-xs text-slate-400">{x.track} · {fmtDate(x.created_at)}</p></div>
                <StatusBadge status={x.status} /></Link>))}</div>}
        </Card>
        <Card>
          <CardHeader title="Status pipeline" subtitle="Across all your papers" />
          <div className="space-y-4 p-5">{stages.map(([l, c, col]) => (
            <div key={l}><div className="mb-1 flex justify-between text-sm"><span className="text-slate-600">{l}</span><span className="font-semibold text-navy">{c}</span></div>
              <div className="h-2 rounded-full bg-slate-100"><div className={`h-2 rounded-full transition-all duration-700 ${col}`} style={{ width: p.length ? `${(c / p.length) * 100}%` : 0 }} /></div></div>))}</div>
        </Card>
      </div>
    </>
  );
}
