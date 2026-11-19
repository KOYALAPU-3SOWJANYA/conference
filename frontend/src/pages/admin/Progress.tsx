import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, Empty, ErrorBox, PageHeader, PageLoader, ProgressBar, StatusBadge, TableWrap, Tabs } from "../../components/ui";
import { fmtDate } from "../../lib/format";
import { useFetch } from "../../lib/hooks";

interface Row { id: number; paper_id: number; paper_code: string; title: string; track: string | null; status: string; version: number; reviewer: { id: number; name: string }; due_date?: string | null; overdue: boolean; overall: number | null; recommendation: any; paper_status: string }

export default function Progress() {
  const { data, error, loading, reload } = useFetch<Row[]>("/admin/assignments", { poll: 8000 });
  const [tab, setTab] = useState<"all" | "assigned" | "in_progress" | "completed" | "overdue">("all");
  const nv = useNavigate();
  const all = data ?? [];
  const rows = all.filter((r) => tab === "all" || (tab === "overdue" ? r.overdue : r.status === tab));
  const done = all.filter((r) => r.status === "completed").length;
  return (
    <>
      <PageHeader title="Review Progress" subtitle="Every reviewer assignment, updated live" />
      <Card className="mb-6 p-5"><div className="mb-2 flex justify-between text-sm"><span className="font-semibold text-navy">Overall completion</span><span className="text-slate-500">{done} of {all.length} reviews</span></div><ProgressBar value={done} max={all.length || 1} className="h-3" /></Card>
      <Card>
        <div className="border-b border-slate-100 p-4"><Tabs value={tab} onChange={setTab} tabs={[{ id: "all", label: "All", count: all.length }, { id: "assigned", label: "Not started", count: all.filter((r) => r.status === "assigned").length }, { id: "in_progress", label: "In progress", count: all.filter((r) => r.status === "in_progress").length }, { id: "completed", label: "Completed", count: done }, { id: "overdue", label: "Overdue", count: all.filter((r) => r.overdue).length }]} /></div>
        {error && <div className="p-4"><ErrorBox message={error} retry={reload} /></div>}
        {loading && !data ? <PageLoader /> : !rows.length ? <Empty title="No assignments" /> : (
          <TableWrap><thead><tr><th>Paper</th><th>Reviewer</th><th>Ver.</th><th>Status</th><th>Due</th><th>Score</th><th>Recommendation</th></tr></thead>
            <tbody>{rows.map((r) => (<tr key={r.id} className="cursor-pointer" onClick={() => nv(`/admin/papers/${r.paper_id}`)}>
              <td><p className="text-xs font-semibold text-royal">{r.paper_code}</p><p className="max-w-[260px] truncate font-medium text-navy">{r.title}</p></td><td>{r.reviewer.name}</td><td>v{r.version}</td><td><StatusBadge status={r.status} /></td>
              <td className={r.overdue ? "font-semibold text-red-600" : "text-slate-500"}>{fmtDate(r.due_date)}{r.overdue && " · overdue"}</td><td className="font-display font-bold text-navy">{r.overall ?? "–"}</td><td>{r.recommendation ? <StatusBadge status={r.recommendation} /> : "–"}</td></tr>))}</tbody></TableWrap>)}
      </Card>
    </>
  );
}
