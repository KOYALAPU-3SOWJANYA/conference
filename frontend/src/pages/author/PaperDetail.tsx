import { CheckCircle2, Circle, Download, FileText, MessageSquareText, RefreshCcw, UploadCloud } from "lucide-react";
import { FormEvent, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import PdfViewer from "../../components/PdfViewer";
import ReviewCard from "../../components/ReviewCard";
import { Button, Card, CardHeader, ErrorBox, Field, Modal, PageHeader, PageLoader, StatusBadge, Textarea, useToast } from "../../components/ui";
import { api, downloadPdf } from "../../lib/api";
import { fmtDate, fmtDateTime, fmtSize, label } from "../../lib/format";
import { useFetch } from "../../lib/hooks";
import { AuthorPaper } from "../../lib/types";

const STEPS = ["Submitted", "Under review", "Decision", "Final"];
function stepIndex(s: string) { return s === "submitted" ? 0 : s === "under_review" ? 1 : s === "accepted" || s === "rejected" ? 3 : 2; }

export default function AuthorPaperDetail() {
  const { id } = useParams();
  const { data: p, error, loading, reload } = useFetch<AuthorPaper>(`/author/papers/${id}`, { poll: 8000 });
  const toast = useToast();
  const [view, setView] = useState<number | null>(null);
  const [rev, setRev] = useState(false); const [note, setNote] = useState(""); const [file, setFile] = useState<File | null>(null); const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLInputElement>(null);

  if (error) return <ErrorBox message={error} retry={reload} />;
  if (loading && !p) return <PageLoader />;
  if (!p) return null;
  const si = stepIndex(p.status);

  const upload = async (e: FormEvent) => {
    e.preventDefault(); if (!file) return toast("Choose the revised PDF", "error");
    setBusy(true);
    try { const fd = new FormData(); fd.append("file", file); fd.append("note", note); await api.upload(`/author/papers/${p.id}/revision`, fd); toast("Revised paper uploaded"); setRev(false); setFile(null); setNote(""); reload(); }
    catch (err: any) { toast(err.message, "error"); } finally { setBusy(false); }
  };

  return (
    <>
      <PageHeader title={p.paper_code} subtitle={p.title} action={<div className="flex items-center gap-2"><StatusBadge status={p.status} />{p.can_revise && <Button icon={<RefreshCcw className="h-4 w-4" />} onClick={() => setRev(true)}>Upload revised paper</Button>}</div>} />
      <Card className="mb-6 p-6">
        <div className="flex items-center">{STEPS.map((s, i) => (
          <div key={s} className="flex flex-1 items-center last:flex-none"><div className="flex flex-col items-center gap-2">
            <span className={`grid h-9 w-9 place-items-center rounded-full text-white transition ${i <= si ? "bg-gradient-to-br from-royal to-electric shadow-glow" : "bg-slate-200"}`}>{i < si || (i === 3 && si === 3) ? <CheckCircle2 className="h-5 w-5" /> : <Circle className="h-4 w-4" />}</span>
            <span className={`text-xs font-semibold ${i <= si ? "text-navy" : "text-slate-400"}`}>{i === 2 && si === 2 ? label(p.status) : s}</span></div>
            {i < STEPS.length - 1 && <div className={`mx-2 mb-6 h-1 flex-1 rounded-full ${i < si ? "bg-royal" : "bg-slate-200"}`} />}</div>))}</div>
      </Card>

      {p.can_revise && <Card className="mb-6 border-cyan-200 bg-cyan-50/70 p-5 text-sm text-cyan-900"><b>{label(p.status)} requested.</b> Read the released feedback below, then upload your revised PDF.</Card>}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card><CardHeader title="Paper details" icon={<FileText className="h-4 w-4" />} />
            <div className="space-y-4 p-5 text-sm">
              <div><p className="label">Abstract</p><p className="whitespace-pre-wrap leading-relaxed text-slate-700">{p.abstract}</p></div>
              <div className="grid gap-4 sm:grid-cols-3"><div><p className="label">Track</p><p className="font-medium">{p.track}</p></div><div><p className="label">Keywords</p><p className="font-medium">{p.keywords || "—"}</p></div><div><p className="label">Co-authors</p><p className="font-medium">{p.co_authors || "—"}</p></div></div>
            </div></Card>

          <Card><CardHeader title="Decisions & feedback" icon={<MessageSquareText className="h-4 w-4" />} subtitle="Feedback appears here once released by the organisers" />
            {!p.decisions.length ? <p className="p-6 text-center text-sm text-slate-500">No decision yet. Your paper is being processed.</p> :
              <div className="space-y-6 p-5">{p.decisions.map((d) => (
                <div key={d.id} className="rounded-2xl border border-slate-200 p-5">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><div className="flex items-center gap-3"><StatusBadge status={d.decision} /><span className="text-sm text-slate-500">on version {d.version_no}</span></div><span className="text-xs text-slate-400">{fmtDateTime(d.decided_at)}</span></div>
                  {d.feedback_released ? (<div className="space-y-4">
                    {d.comments && <div className="rounded-xl bg-blue-50 p-4"><p className="label">Message from the organisers</p><p className="whitespace-pre-wrap text-sm text-slate-700">{d.comments}</p></div>}
                    {d.reviews.map((r) => <ReviewCard key={r.id} review={r} heading={r.reviewer_label} />)}
                    {!d.reviews.length && !d.comments && <p className="text-sm text-slate-500">No written feedback was included.</p>}
                  </div>) : <p className="text-sm text-slate-500">Detailed reviewer feedback has not been released yet.</p>}
                </div>))}</div>}
          </Card>
        </div>

        <div className="space-y-6">
          <Card><CardHeader title="Version history" subtitle={`${p.versions.length} version(s)`} />
            <ul className="divide-y divide-slate-100">{[...p.versions].reverse().map((v) => (
              <li key={v.version_no} className="p-4"><div className="flex items-center justify-between"><p className="font-semibold text-navy">Version {v.version_no}{v.version_no === p.current_version && <span className="ml-2 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-700">Current</span>}</p><span className="text-xs text-slate-400">{fmtSize(v.size)}</span></div>
                <p className="mt-0.5 text-xs text-slate-500">{fmtDateTime(v.uploaded_at)}</p>{v.note && <p className="mt-1 text-xs italic text-slate-500">“{v.note}”</p>}
                <div className="mt-2 flex gap-2"><Button size="sm" variant="secondary" onClick={() => setView(v.version_no)}>View</Button>
                  <Button size="sm" variant="ghost" icon={<Download className="h-3.5 w-3.5" />} onClick={() => downloadPdf(`/author/papers/${p.id}/download?version=${v.version_no}`, `${p.paper_code}_v${v.version_no}.pdf`)}>Download</Button></div></li>))}</ul></Card>
          <Card className="p-5 text-sm"><p className="label">Submitted</p><p className="font-medium">{fmtDate(p.created_at, true)}</p><p className="label mt-3">Last updated</p><p className="font-medium">{fmtDateTime(p.updated_at)}</p></Card>
        </div>
      </div>

      <Modal open={view !== null} onClose={() => setView(null)} title={`${p.paper_code} — version ${view}`} size="xl">
        {view !== null && <PdfViewer path={`/author/papers/${p.id}/download?version=${view}`} filename={`${p.paper_code}_v${view}.pdf`} />}
      </Modal>
      <Modal open={rev} onClose={() => setRev(false)} title="Upload revised paper" footer={<><Button variant="secondary" onClick={() => setRev(false)}>Cancel</Button><Button form="rev-form" type="submit" loading={busy} icon={<UploadCloud className="h-4 w-4" />}>Upload version {p.current_version + 1}</Button></>}>
        <form id="rev-form" onSubmit={upload} className="space-y-4">
          <Field label="Revised PDF"><input ref={ref} type="file" accept="application/pdf,.pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="input file:mr-3 file:rounded-lg file:border-0 file:bg-blue-50 file:px-3 file:py-1.5 file:font-semibold file:text-royal" /></Field>
          <Field label="Summary of changes" hint="Optional — helps reviewers see what you addressed"><Textarea rows={4} value={note} onChange={(e) => setNote(e.target.value)} /></Field>
        </form>
      </Modal>
    </>
  );
}
