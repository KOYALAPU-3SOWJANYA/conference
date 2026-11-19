import { Award, CheckCircle2, ClipboardCheck, FileText, Gavel, Hourglass, UserCheck, UserPlus, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, PolarAngleAxis, PolarGrid, Radar, RadarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardHeader, Empty, ErrorBox, PageHeader, PageLoader, ProgressBar, StatCard, StatusBadge } from "../../components/ui";
import { fmtDate, label } from "../../lib/format";
import { useFetch } from "../../lib/hooks";
import { Paper } from "../../lib/types";

interface Summary {
  kpis: Record<string, number | null>; by_status: Record<string, number>; by_track: { name: string; count: number }[];
  submissions_over_time: { date: string; count: number }[]; review_progress: Record<string, number>;
  recommendations: { name: string; count: number }[]; avg_criteria: { criterion: string; score: number }[];
  reviewer_load: { id: number; name: string; assigned: number; completed: number }[];
  recent_papers: Paper[]; needs_decision: Paper[]; needs_reviewers: Paper[];
}
const STATUS_COLORS: Record<string, string> = { submitted: "#94a3b8", under_review: "#f59e0b", minor_revision: "#00A6FF", major_revision: "#f97316", accepted: "#10b981", rejected: "#ef4444" };
const PALETTE = ["#082D72", "#0757C8", "#00A6FF", "#7900A8", "#b04bdc", "#10b981"];

function PaperList({ items, empty, link }: { items: Paper[]; empty: string; link: (p: Paper) => string }) {
  if (!items.length) return <Empty title={empty} />;
  return <div className="divide-y divide-slate-100">{items.map((p) => (
    <Link key={p.id} to={link(p)} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50">
      <div className="min-w-0 flex-1"><p className="text-xs font-semibold text-royal">{p.paper_code}</p><p className="truncate text-sm font-medium text-navy">{p.title}</p><p className="text-xs text-slate-400">{p.author?.name} · {fmtDate(p.created_at)}</p></div><StatusBadge status={p.status} /></Link>))}</div>;
}

export default function AdminOverview() {
  const { data: d, error, loading, reload } = useFetch<Summary>("/admin/summary", { poll: 8000 });
  if (error) return <ErrorBox message={error} retry={reload} />;
  if (loading && !d) return <PageLoader />;
  if (!d) return null;
  const k = d.kpis;
  let run = 0; const cumulative = d.submissions_over_time.map((x) => ({ date: fmtDate(x.date), total: (run += x.count), daily: x.count }));
  const statusData = Object.entries(d.by_status).filter(([, v]) => v > 0).map(([n, v]) => ({ name: label(n), value: v, key: n }));
  const progress = [{ name: "Assigned", value: d.review_progress.assigned }, { name: "In progress", value: d.review_progress.in_progress }, { name: "Completed", value: d.review_progress.completed }];
  const pct = k.reviews_total ? Math.round(((k.reviews_completed ?? 0) / (k.reviews_total ?? 1)) * 100) : 0;
  const tip = { contentStyle: { borderRadius: 12, border: "1px solid #e2e8f0", boxShadow: "0 10px 30px -12px rgba(8,45,114,.3)" } };

  return (
    <>
      <PageHeader title="Conference Overview" subtitle="Live analytics from the database — refreshes automatically" />
      <div className="stagger grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total submissions" value={k.total_papers} icon={<FileText className="h-5 w-5" />} tone="navy" />
        <StatCard label="Awaiting reviewers" value={k.awaiting_assignment} icon={<UserPlus className="h-5 w-5" />} tone="amber" sub="Need assignment" />
        <StatCard label="Ready for decision" value={k.ready_for_decision} icon={<Gavel className="h-5 w-5" />} tone="purple" sub="All reviews in" />
        <StatCard label="Accepted" value={k.accepted} icon={<CheckCircle2 className="h-5 w-5" />} tone="green" sub={`${k.rejected} rejected · ${k.revision} in revision`} />
        <StatCard label="Authors" value={k.authors} icon={<Users className="h-5 w-5" />} tone="blue" />
        <StatCard label="Reviewers" value={k.reviewers} icon={<UserCheck className="h-5 w-5" />} tone="cyan" sub={k.pending_reviewers ? `${k.pending_reviewers} pending approval` : undefined} />
        <StatCard label="Reviews completed" value={`${k.reviews_completed}/${k.reviews_total}`} icon={<ClipboardCheck className="h-5 w-5" />} tone="green" sub={`${pct}% done`} />
        <StatCard label="Average score" value={k.avg_score ?? "–"} icon={<Award className="h-5 w-5" />} tone="purple" sub="Out of 10" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2"><CardHeader title="Submissions over time" subtitle="Cumulative papers received" />
          <div className="h-72 p-4">{!cumulative.length ? <Empty title="No submissions yet" /> : (
            <ResponsiveContainer><AreaChart data={cumulative}><defs><linearGradient id="g1" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#0757C8" stopOpacity={0.5} /><stop offset="95%" stopColor="#00A6FF" stopOpacity={0.02} /></linearGradient></defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" /><XAxis dataKey="date" tick={{ fontSize: 11 }} /><YAxis allowDecimals={false} tick={{ fontSize: 11 }} /><Tooltip {...tip} />
              <Area type="monotone" dataKey="total" name="Total papers" stroke="#0757C8" strokeWidth={3} fill="url(#g1)" /></AreaChart></ResponsiveContainer>)}</div></Card>
        <Card><CardHeader title="Papers by status" />
          <div className="h-72 p-2">{!statusData.length ? <Empty title="No data yet" /> : (
            <ResponsiveContainer><PieChart><Pie data={statusData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={3}>{statusData.map((s) => <Cell key={s.key} fill={STATUS_COLORS[s.key]} />)}</Pie>
              <Tooltip {...tip} /><Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} /></PieChart></ResponsiveContainer>)}</div></Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card><CardHeader title="Papers by track" />
          <div className="h-72 p-4"><ResponsiveContainer><BarChart data={d.by_track} layout="vertical" margin={{ left: 10 }}><CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
            <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} /><YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 10 }} tickFormatter={(v: string) => (v.length > 17 ? v.slice(0, 16) + "…" : v)} />
            <Tooltip {...tip} /><Bar dataKey="count" name="Papers" radius={[0, 8, 8, 0]}>{d.by_track.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}</Bar></BarChart></ResponsiveContainer></div></Card>
        <Card><CardHeader title="Review progress" subtitle={`${pct}% of all assignments completed`} />
          <div className="h-72 p-4"><ResponsiveContainer><BarChart data={progress}><CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} /><XAxis dataKey="name" tick={{ fontSize: 11 }} /><YAxis allowDecimals={false} tick={{ fontSize: 11 }} /><Tooltip {...tip} />
            <Bar dataKey="value" name="Assignments" radius={[8, 8, 0, 0]}><Cell fill="#94a3b8" /><Cell fill="#f59e0b" /><Cell fill="#10b981" /></Bar></BarChart></ResponsiveContainer></div></Card>
        <Card><CardHeader title="Average score by criterion" />
          <div className="h-72 p-2">{d.avg_criteria.every((c) => !c.score) ? <Empty title="No reviews yet" /> : (
            <ResponsiveContainer><RadarChart data={d.avg_criteria.map((c) => ({ ...c, criterion: label(c.criterion).replace("Technical Quality", "Technical") }))}><PolarGrid stroke="#e2e8f0" /><PolarAngleAxis dataKey="criterion" tick={{ fontSize: 11 }} />
              <Radar dataKey="score" name="Avg score" stroke="#7900A8" fill="#7900A8" fillOpacity={0.35} /><Tooltip {...tip} /></RadarChart></ResponsiveContainer>)}</div></Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card><CardHeader title="Needs reviewers" icon={<Hourglass className="h-4 w-4" />} /><PaperList items={d.needs_reviewers} empty="Every paper has reviewers" link={(p) => `/admin/papers/${p.id}`} /></Card>
        <Card><CardHeader title="Ready for decision" icon={<Gavel className="h-4 w-4" />} /><PaperList items={d.needs_decision} empty="No papers waiting" link={(p) => `/admin/papers/${p.id}`} /></Card>
        <Card><CardHeader title="Recent submissions" icon={<FileText className="h-4 w-4" />} /><PaperList items={d.recent_papers} empty="No submissions yet" link={(p) => `/admin/papers/${p.id}`} /></Card>
      </div>

      <Card className="mt-6"><CardHeader title="Reviewer workload" subtitle="Assigned vs completed reviews" action={<Link to="/admin/progress" className="text-sm font-semibold text-royal">Review progress</Link>} />
        {!d.reviewer_load.length ? <Empty title="No approved reviewers yet" /> : <div className="grid gap-x-8 gap-y-4 p-5 md:grid-cols-2">{d.reviewer_load.map((r) => (
          <div key={r.id}><div className="mb-1 flex justify-between text-sm"><span className="font-medium text-navy">{r.name}</span><span className="text-slate-500">{r.completed}/{r.assigned} done</span></div><ProgressBar value={r.completed} max={r.assigned || 1} /></div>))}</div>}</Card>
    </>
  );
}
