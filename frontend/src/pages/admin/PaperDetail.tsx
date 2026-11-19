import { ChevronDown, Download, Gavel, Search, Trash2, UserPlus } from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import PdfViewer from "../../components/PdfViewer";
import ReviewCard from "../../components/ReviewCard";
import { Button, Card, CardHeader, ConfirmModal, Empty, ErrorBox, Field, Input, Modal, PageHeader, PageLoader, Select, StatusBadge, Switch, Textarea, useToast, cn } from "../../components/ui";
import { api, downloadPdf } from "../../lib/api";
import { fmtDate, fmtDateTime, fmtSize, label } from "../../lib/format";
import { useFetch } from "../../lib/hooks";
import { AdminPaper, User } from "../../lib/types";

export default function AdminPaperDetail() {
  const { id } = useParams();
  const { data: p, error, loading, reload, setData } = useFetch<AdminPaper>(`/admin/papers/${id}`, { poll: 8000 });
  const reviewers = useFetch<User[]>("/admin/users?role=reviewer");
  const toast = useToast();
  const [ver, setVer] = useState<number | null>(null);
  const [assign, setAssign] = useState(false); const [sel, setSel] = useState<number[]>([]); const [due, setDue] = useState(""); const [rq, setRq] = useState("");
  const [decision, setDecision] = useState("accepted"); const [comments, setComments] = useState(""); const [release, setRelease] = useState(true);
  const [confirmDec, setConfirmDec] = useState(false); const [rm, setRm] = useState<number | null>(null); const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState<number | null>(null);

  if (error) return <ErrorBox message={error} retry={reload} />;
  if (loading && !p) return <PageLoader />;
  if (!p) return null;
  const assigned = new Set(p.assignments.map((a) => a.reviewer.id));
  const pool = (reviewers.data ?? []).filter((r) => r.approval_status === "approved" && r.is_active && !assigned.has(r.id) && (r.name + (r.expertise ?? "") + (r.affiliation ?? "")).toLowerCase().includes(rq.toLowerCase()));
  const done = p.assignments.filter((a) => a.status === "completed").length;

  const run = async (fn: () => Promise<any>, ok: string) => { setBusy(true); try { await fn(); toast(ok); reload(); return true; } catch (e: any) { toast(e.message, "error"); return false; } finally { setBusy(false); } };
  const doAssign = async () => { if (await run(() => api.post(`/admin/papers/${p.id}/assign`, { reviewer_ids: sel, due_date: due || null }), `Assigned ${sel.length} reviewer(s)`)) { setAssign(false); setSel([]); setDue(""); } };
  const doDecide = async () => { if (await run(async () => setData(await api.post(`/admin/papers/${p.id}/decision`, { decision, comments: comments || null, release_feedback: release })), "Decision recorded and author notified")) { setConfirmDec(false); setComments(""); } };
  const doRemove = async () => { if (rm !== null && await run(() => api.del(`/admin/assignments/${rm}`), "Reviewer removed")) setRm(null); };
  const toggleRelease = (v: boolean) => run(async () => setData(await api.post(`/admin/papers/${p.id}/release`, { release_feedback: v })), v ? "Feedback released to the author" : "Feedback hidden from the author");
  const latest = p.decisions[0];

  return (
    <>
      <Link to="/admin/papers" className="mb-3 inline-block text-sm font-medium text-slate-500 hover:text-navy">← All papers</Link>
      <PageHeader title={p.paper_code} subtitle={p.title} action={<div className="flex items-center gap-2"><StatusBadge status={p.status} /><Button icon={<UserPlus className="h-4 w-4" />} onClick={() => setAssign(true)} disabled={p.status === "accepted" || p.status === "rejected"}>Assign reviewers</Button></div>} />

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Card><CardHeader title="Paper information" />
            <div className="space-y-4 p-5 text-sm"><div><p className="label">Abstract</p><p className="whitespace-pre-wrap leading-relaxed">{p.abstract}</p></div>
              <div className="grid gap-4 sm:grid-cols-3"><div><p className="label">Track</p><p className="font-medium">{p.track}</p></div><div><p className="label">Keywords</p><p className="font-medium">{p.keywords || "—"}</p></div><div><p className="label">Co-authors</p><p className="font-medium">{p.co_authors || "—"}</p></div></div></div></Card>

          <Card><CardHeader title="Reviews" subtitle={`${done} of ${p.assignments.length} completed`} />
            {!p.assignments.length ? <Empty title="No reviewers assigned" text="Assign reviewers to start peer review." action={<Button onClick={() => setAssign(true)}>Assign reviewers</Button>} /> : (
              <div className="divide-y divide-slate-100">{p.assignments.map((a) => (
                <div key={a.id} className="p-5">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-plum to-fuchsia-400 font-bold text-white">{a.reviewer.name[0]}</span>
                    <div className="min-w-0 flex-1"><p className="font-semibold text-navy">{a.reviewer.name}</p><p className="truncate text-xs text-slate-500">{a.reviewer.affiliation} · due {fmtDate(a.due_date)}</p></div>
                    <StatusBadge status={a.status} />
                    {a.reviews.length > 0 && <Button size="sm" variant="secondary" icon={<ChevronDown className={cn("h-4 w-4 transition", open === a.id && "rotate-180")} />} onClick={() => setOpen(open === a.id ? null : a.id)}>{open === a.id ? "Hide" : "View"} review{a.reviews.length > 1 ? "s" : ""}</Button>}
                    {!a.reviews.some((r) => r.is_final) && <button className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600" aria-label="Remove reviewer" onClick={() => setRm(a.id)}><Trash2 className="h-4 w-4" /></button>}
                  </div>
                  {open === a.id && <div className="mt-4 space-y-4">{[...a.reviews].reverse().map((r) => <ReviewCard key={r.id} review={r} heading={`${a.reviewer.name}${r.is_final ? "" : " (draft)"}`} confidential />)}</div>}
                </div>))}</div>)}
          </Card>
        </div>

        <div className="space-y-6">
          <Card><CardHeader title="Author" /><div className="space-y-1 p-5 text-sm"><p className="font-semibold text-navy">{p.author?.name}</p><p className="text-slate-500">{p.author?.email}</p><p className="text-slate-500">{p.author?.affiliation}</p>{p.author?.phone && <p className="text-slate-500">{p.author.phone}</p>}</div></Card>

          <Card><CardHeader title="Files & versions" />
            <ul className="divide-y divide-slate-100">{[...p.versions].reverse().map((v) => (<li key={v.version_no} className="p-4"><div className="flex justify-between"><p className="font-semibold text-navy">v{v.version_no}{v.version_no === p.current_version && <span className="ml-2 text-[10px] font-bold uppercase text-emerald-600">current</span>}</p><span className="text-xs text-slate-400">{fmtSize(v.size)}</span></div>
              <p className="text-xs text-slate-500">{fmtDateTime(v.uploaded_at)}</p>{v.note && <p className="mt-1 text-xs italic text-slate-500">“{v.note}”</p>}
              <div className="mt-2 flex gap-2"><Button size="sm" variant="secondary" onClick={() => setVer(v.version_no)}>View</Button><Button size="sm" variant="ghost" icon={<Download className="h-3.5 w-3.5" />} onClick={() => downloadPdf(`/admin/papers/${p.id}/download?version=${v.version_no}`, `${p.paper_code}_v${v.version_no}.pdf`)}>Download</Button></div></li>))}</ul></Card>

          <Card><CardHeader title="Final decision" icon={<Gavel className="h-4 w-4" />} subtitle="Only the admin can decide" />
            <div className="space-y-4 p-5">
              <Field label="Decision"><Select value={decision} onChange={(e) => setDecision(e.target.value)}><option value="accepted">Accept</option><option value="minor_revision">Minor revision</option><option value="major_revision">Major revision</option><option value="rejected">Reject</option></Select></Field>
              <Field label="Message to author" hint="Shown to the author when feedback is released"><Textarea rows={4} value={comments} onChange={(e) => setComments(e.target.value)} /></Field>
              <Switch checked={release} onChange={setRelease} label="Release reviewer feedback to author" />
              <Button className="w-full" loading={busy} onClick={() => setConfirmDec(true)}>Record decision</Button>
              {latest && <div className="rounded-xl bg-slate-50 p-3 text-sm"><div className="flex items-center justify-between"><span className="text-slate-500">Latest:</span><StatusBadge status={latest.decision} /></div>
                <div className="mt-3"><Switch checked={latest.release_feedback} onChange={toggleRelease} label="Feedback visible to author" /></div></div>}
            </div></Card>

          {p.decisions.length > 0 && <Card><CardHeader title="Decision history" /><ul className="divide-y divide-slate-100">{p.decisions.map((d) => (<li key={d.id} className="p-4 text-sm"><div className="flex items-center justify-between"><StatusBadge status={d.decision} /><span className="text-xs text-slate-400">{fmtDateTime(d.decided_at)}</span></div><p className="mt-1 text-xs text-slate-500">v{d.version_no} · by {d.decided_by ?? "admin"} · feedback {d.release_feedback ? "released" : "hidden"}</p></li>))}</ul></Card>}
        </div>
      </div>

      <Modal open={ver !== null} onClose={() => setVer(null)} title={`${p.paper_code} — version ${ver}`} size="xl">{ver !== null && <PdfViewer path={`/admin/papers/${p.id}/download?version=${ver}`} filename={`${p.paper_code}_v${ver}.pdf`} />}</Modal>

      <Modal open={assign} onClose={() => setAssign(false)} title="Assign reviewers" size="lg" footer={<><Button variant="secondary" onClick={() => setAssign(false)}>Cancel</Button><Button disabled={!sel.length} loading={busy} onClick={doAssign}>Assign {sel.length || ""} reviewer{sel.length === 1 ? "" : "s"}</Button></>}>
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2"><div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" /><Input className="pl-9" placeholder="Search name or expertise" value={rq} onChange={(e) => setRq(e.target.value)} /></div><Input type="date" value={due} onChange={(e) => setDue(e.target.value)} aria-label="Due date" /></div>
          <div className="max-h-80 space-y-2 overflow-y-auto pr-1">{!pool.length ? <Empty title="No available reviewers" text="Approve reviewers from the Reviewers page first." /> : pool.map((r) => (
            <label key={r.id} className={cn("flex cursor-pointer items-start gap-3 rounded-xl border-2 p-3 transition", sel.includes(r.id) ? "border-royal bg-blue-50" : "border-slate-200 hover:border-slate-300")}>
              <input type="checkbox" className="mt-1 h-4 w-4 accent-royal" checked={sel.includes(r.id)} onChange={() => setSel((s) => (s.includes(r.id) ? s.filter((x) => x !== r.id) : [...s, r.id]))} />
              <div className="min-w-0 flex-1"><p className="font-semibold text-navy">{r.name} <span className="ml-1 text-xs font-normal text-slate-400">{r.completed}/{r.assigned} reviews done</span></p><p className="text-xs text-slate-500">{r.affiliation}</p><p className="mt-0.5 text-xs text-slate-400">{r.expertise}</p></div></label>))}</div>
        </div>
      </Modal>
      <ConfirmModal open={confirmDec} onClose={() => setConfirmDec(false)} onConfirm={doDecide} loading={busy} title="Record final decision?" confirmLabel="Record decision" danger={decision === "rejected"}
        text={`You are about to mark ${p.paper_code} as "${label(decision)}". The author will be notified in their dashboard${release ? " and will see the released reviewer feedback" : ""}.`} />
      <ConfirmModal open={rm !== null} onClose={() => setRm(null)} onConfirm={doRemove} loading={busy} danger title="Remove reviewer?" confirmLabel="Remove" text="Their draft review (if any) will be deleted and the paper will disappear from their dashboard." />
    </>
  );
}
