import { Search } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, Empty, ErrorBox, Input, PageHeader, PageLoader, Select, StatusBadge, TableWrap } from "../../components/ui";
import { fmtDate } from "../../lib/format";
import { useFetch } from "../../lib/hooks";
import { Paper, Track } from "../../lib/types";

export default function AdminPapers() {
  const [q, setQ] = useState(""); const [st, setSt] = useState(""); const [tr, setTr] = useState("");
  const params = new URLSearchParams(); if (q) params.set("q", q); if (st) params.set("status", st); if (tr) params.set("track_id", tr);
  const { data, error, loading, reload } = useFetch<Paper[]>(`/admin/papers?${params}`, { poll: 8000 });
  const tracks = useFetch<Track[]>("/admin/tracks");
  const nv = useNavigate();
  return (
    <>
      <PageHeader title="Paper Submissions" subtitle={`${data?.length ?? 0} paper(s) match the current filters`} />
      <Card>
        <div className="flex flex-wrap gap-3 border-b border-slate-100 p-4">
          <div className="relative min-w-[220px] flex-1"><Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" /><Input className="pl-9" placeholder="Search by title, Paper ID or author" value={q} onChange={(e) => setQ(e.target.value)} /></div>
          <Select className="w-48" value={st} onChange={(e) => setSt(e.target.value)}><option value="">All statuses</option>{["submitted", "under_review", "minor_revision", "major_revision", "accepted", "rejected"].map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}</Select>
          <Select className="w-56" value={tr} onChange={(e) => setTr(e.target.value)}><option value="">All tracks</option>{tracks.data?.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</Select>
        </div>
        {error && <div className="p-4"><ErrorBox message={error} retry={reload} /></div>}
        {loading && !data ? <PageLoader /> : !data?.length ? <Empty title="No papers found" text="Submissions from authors will appear here in real time." /> : (
          <TableWrap><thead><tr><th>Paper ID</th><th>Title</th><th>Author</th><th>Track</th><th>Status</th><th>Reviews</th><th>Avg</th><th>Submitted</th></tr></thead>
            <tbody>{data.map((p) => (<tr key={p.id} className="cursor-pointer" onClick={() => nv(`/admin/papers/${p.id}`)}>
              <td className="font-semibold text-royal">{p.paper_code}</td><td className="max-w-[280px] truncate font-medium text-navy">{p.title}</td><td className="text-slate-600">{p.author?.name}</td>
              <td className="max-w-[160px] truncate text-slate-500">{p.track}</td><td><StatusBadge status={p.status} /></td>
              <td><span className="font-medium">{p.reviews_completed}</span><span className="text-slate-400">/{p.reviewers_assigned}</span></td><td className="font-display font-bold text-navy">{p.avg_score ?? "–"}</td><td className="text-slate-500">{fmtDate(p.created_at)}</td></tr>))}</tbody></TableWrap>)}
      </Card>
    </>
  );
}
