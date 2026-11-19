import { AlarmClock, ArrowRight, CheckCircle2, ClipboardList, PenLine } from "lucide-react";
import { Link } from "react-router-dom";
import { Card, CardHeader, Empty, ErrorBox, PageLoader, ProgressBar, StatCard, StatusBadge } from "../../components/ui";
import { useAuth } from "../../lib/auth";
import { fmtDate } from "../../lib/format";
import { useFetch } from "../../lib/hooks";
import { ReviewerAssignment } from "../../lib/types";

export const isOverdue = (a: ReviewerAssignment) => !!a.due_date && a.status !== "completed" && new Date(a.due_date + "T23:59:59") < new Date();

export default function ReviewerOverview() {
  const { user } = useAuth();
  const { data, error, loading, reload } = useFetch<ReviewerAssignment[]>("/reviewer/assignments", { poll: 8000 });
  if (error) return <ErrorBox message={error} retry={reload} />;
  if (loading && !data) return <PageLoader />;
  const a = data ?? [];
  const done = a.filter((x) => x.status === "completed").length;
  const todo = a.filter((x) => x.status !== "completed");
  return (
    <>
      <div className="relative mb-8 overflow-hidden rounded-3xl bg-gradient-to-br from-plum-900 via-plum-700 to-plum p-7 text-white shadow-soft md:p-9 animate-fadeUp">
        <div className="grid-bg absolute inset-0 opacity-40" /><div className="absolute -right-10 -top-10 h-56 w-56 rounded-full bg-fuchsia-400/30 blur-3xl" />
        <div className="relative"><p className="text-sm text-purple-200">Welcome,</p><h1 className="text-3xl font-bold !text-white">{user?.name}</h1>
          <p className="mt-1 text-purple-200">{todo.length ? `${todo.length} paper${todo.length > 1 ? "s" : ""} waiting for your evaluation.` : "You're all caught up. Thank you for reviewing!"}</p>
          <div className="mt-5 max-w-sm"><div className="mb-1 flex justify-between text-xs text-purple-200"><span>Progress</span><span>{done}/{a.length}</span></div><ProgressBar value={done} max={a.length || 1} color="linear-gradient(90deg,#fff,#e9b6ff)" className="bg-white/20" /></div></div>
      </div>
      <div className="stagger grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Assigned" value={a.length} icon={<ClipboardList className="h-5 w-5" />} tone="purple" />
        <StatCard label="Pending" value={a.filter((x) => x.review_state === "none").length} icon={<AlarmClock className="h-5 w-5" />} tone="amber" />
        <StatCard label="Drafts in progress" value={a.filter((x) => x.review_state === "draft").length} icon={<PenLine className="h-5 w-5" />} tone="cyan" />
        <StatCard label="Completed" value={done} icon={<CheckCircle2 className="h-5 w-5" />} tone="green" />
      </div>
      <Card className="mt-6">
        <CardHeader title="Next up" subtitle="Papers that still need your review" action={<Link to="/reviewer/assignments" className="text-sm font-semibold" style={{ color: "var(--a1)" }}>All assignments</Link>} />
        {!todo.length ? <Empty title="Nothing pending" text="New assignments will show up here automatically." /> :
          <div className="divide-y divide-slate-100">{todo.slice(0, 6).map((x) => (
            <Link key={x.id} to={`/reviewer/assignments/${x.id}`} className="flex items-center gap-4 px-5 py-4 hover:bg-[color:var(--a-soft)]">
              <div className="min-w-0 flex-1"><p className="text-xs font-semibold" style={{ color: "var(--a1)" }}>{x.paper_code} · v{x.current_version}</p><p className="truncate font-medium text-navy">{x.title}</p>
                <p className={`text-xs ${isOverdue(x) ? "font-semibold text-red-600" : "text-slate-400"}`}>{x.due_date ? `Due ${fmtDate(x.due_date)}${isOverdue(x) ? " · overdue" : ""}` : "No due date"}</p></div>
              <StatusBadge status={x.review_state} /><ArrowRight className="h-4 w-4 text-slate-400" /></Link>))}</div>}
      </Card>
    </>
  );
}
