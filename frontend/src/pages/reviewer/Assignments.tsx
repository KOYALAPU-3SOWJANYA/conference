import { Search } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Card, Empty, ErrorBox, Input, PageHeader, PageLoader, StatusBadge, Tabs, TableWrap } from "../../components/ui";
import { fmtDate } from "../../lib/format";
import { useFetch } from "../../lib/hooks";
import { ReviewerAssignment } from "../../lib/types";
import { isOverdue } from "./Overview";

export default function Assignments() {
  const { data, error, loading, reload } = useFetch<ReviewerAssignment[]>("/reviewer/assignments", { poll: 8000 });
  const [tab, setTab] = useState<"all" | "pending" | "done">("all"); const [q, setQ] = useState("");
  const nv = useNavigate();
  const all = data ?? [];
  const rows = all.filter((a) => (tab === "all" || (tab === "done" ? a.status === "completed" : a.status !== "completed")) && (a.title + a.paper_code).toLowerCase().includes(q.toLowerCase()));
  return (
    <>
      <PageHeader title="Assigned Papers" subtitle="Only papers assigned to you by the organising committee appear here" />
      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 p-4">
          <Tabs value={tab} onChange={setTab} tabs={[{ id: "all", label: "All", count: all.length }, { id: "pending", label: "To review", count: all.filter((a) => a.status !== "completed").length }, { id: "done", label: "Completed", count: all.filter((a) => a.status === "completed").length }]} />
          <div className="relative ml-auto min-w-[220px] flex-1 sm:max-w-xs"><Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" /><Input className="pl-9" placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        </div>
        {error && <div className="p-4"><ErrorBox message={error} retry={reload} /></div>}
        {loading && !data ? <PageLoader /> : !rows.length ? <Empty title="No papers here" text="You'll be notified when new papers are assigned." /> : (
          <TableWrap><thead><tr><th>Paper ID</th><th>Title</th><th>Track</th><th>Version</th><th>Due</th><th>Review</th><th /></tr></thead>
            <tbody>{rows.map((a) => (<tr key={a.id} className="cursor-pointer" onClick={() => nv(`/reviewer/assignments/${a.id}`)}>
              <td className="font-semibold" style={{ color: "var(--a1)" }}>{a.paper_code}</td><td className="max-w-xs truncate font-medium text-navy">{a.title}</td><td className="text-slate-500">{a.track}</td><td>v{a.current_version}</td>
              <td className={isOverdue(a) ? "font-semibold text-red-600" : "text-slate-500"}>{fmtDate(a.due_date)}</td><td><StatusBadge status={a.review_state} /></td>
              <td><Button size="sm" variant={a.status === "completed" ? "secondary" : "primary"}>{a.status === "completed" ? "View" : a.review_state === "draft" ? "Continue" : "Start review"}</Button></td></tr>))}</tbody></TableWrap>)}
      </Card>
    </>
  );
}
