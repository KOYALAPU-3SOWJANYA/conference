import { FilePlus2, Search } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Card, Empty, ErrorBox, Input, PageHeader, PageLoader, Select, StatusBadge, TableWrap } from "../../components/ui";
import { fmtDate } from "../../lib/format";
import { useFetch } from "../../lib/hooks";
import { Paper } from "../../lib/types";

export default function AuthorPapers() {
  const { data, error, loading, reload } = useFetch<Paper[]>("/author/papers", { poll: 8000 });
  const [q, setQ] = useState(""); const [st, setSt] = useState("");
  const nv = useNavigate();
  const rows = (data ?? []).filter((p) => (!st || p.status === st) && (p.title + p.paper_code).toLowerCase().includes(q.toLowerCase()));
  return (
    <>
      <PageHeader title="My Papers" subtitle="Every submission and its current status" action={<Link to="/author/submit" className="btn btn-primary"><FilePlus2 className="h-4 w-4" />New submission</Link>} />
      <Card>
        <div className="flex flex-wrap gap-3 border-b border-slate-100 p-4">
          <div className="relative min-w-[220px] flex-1"><Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" /><Input className="pl-9" placeholder="Search title or Paper ID" value={q} onChange={(e) => setQ(e.target.value)} /></div>
          <Select className="w-52" value={st} onChange={(e) => setSt(e.target.value)}><option value="">All statuses</option>{["submitted", "under_review", "minor_revision", "major_revision", "accepted", "rejected"].map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}</Select>
        </div>
        {error && <div className="p-4"><ErrorBox message={error} retry={reload} /></div>}
        {loading && !data ? <PageLoader /> : !rows.length ? <Empty title="No papers found" text="Try a different filter or submit a new paper." /> : (
          <TableWrap><thead><tr><th>Paper ID</th><th>Title</th><th>Track</th><th>Version</th><th>Status</th><th>Submitted</th></tr></thead>
            <tbody>{rows.map((p) => (<tr key={p.id} className="cursor-pointer" onClick={() => nv(`/author/papers/${p.id}`)}>
              <td className="font-semibold text-royal">{p.paper_code}</td><td className="max-w-xs truncate font-medium text-navy">{p.title}</td><td className="text-slate-500">{p.track}</td>
              <td>v{p.current_version}</td><td><StatusBadge status={p.status} /></td><td className="text-slate-500">{fmtDate(p.created_at)}</td></tr>))}</tbody></TableWrap>)}
      </Card>
    </>
  );
}
