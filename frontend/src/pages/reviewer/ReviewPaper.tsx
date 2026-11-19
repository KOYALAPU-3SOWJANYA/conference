import { ArrowLeft, Lock, Save, Send } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import PdfViewer from "../../components/PdfViewer";
import ReviewCard from "../../components/ReviewCard";
import { Button, Card, CardHeader, ConfirmModal, ErrorBox, Field, PageLoader, StatusBadge, Tabs, Textarea, cn, useToast } from "../../components/ui";
import { api } from "../../lib/api";
import { fmtDate, label } from "../../lib/format";
import { useFetch } from "../../lib/hooks";
import { CRITERIA, Recommendation, ReviewerAssignment } from "../../lib/types";

const RECS: { v: Recommendation; l: string; d: string; c: string }[] = [
  { v: "accept", l: "Accept", d: "Ready as is", c: "border-emerald-400 bg-emerald-50 text-emerald-800" },
  { v: "minor_revision", l: "Minor revision", d: "Small fixes", c: "border-cyan-400 bg-cyan-50 text-cyan-800" },
  { v: "major_revision", l: "Major revision", d: "Substantial work", c: "border-orange-400 bg-orange-50 text-orange-800" },
  { v: "reject", l: "Reject", d: "Not suitable", c: "border-red-400 bg-red-50 text-red-800" },
];

export default function ReviewPaper() {
  const { id } = useParams();
  const { data: a, error, loading, reload } = useFetch<ReviewerAssignment>(`/reviewer/assignments/${id}`);
  const toast = useToast();
  const [tab, setTab] = useState<"paper" | "abstract">("paper");
  const [f, setF] = useState<any>({ originality: 5, technical_quality: 5, relevance: 5, clarity: 5, significance: 5, touched: {}, strengths: "", weaknesses: "", comments: "", confidential_comments: "", recommendation: null });
  const [saving, setSaving] = useState(false); const [confirm, setConfirm] = useState(false);

  useEffect(() => {
    if (!a) return;
    const r = a.review;
    if (r) setF({ originality: r.originality ?? 5, technical_quality: r.technical_quality ?? 5, relevance: r.relevance ?? 5, clarity: r.clarity ?? 5, significance: r.significance ?? 5,
      touched: { originality: r.originality != null, technical_quality: r.technical_quality != null, relevance: r.relevance != null, clarity: r.clarity != null, significance: r.significance != null },
      strengths: r.strengths ?? "", weaknesses: r.weaknesses ?? "", comments: r.comments ?? "", confidential_comments: r.confidential_comments ?? "", recommendation: r.recommendation ?? null });
  }, [a?.id, a?.review?.id]);

  if (error) return <ErrorBox message={error} retry={reload} />;
  if (loading && !a) return <PageLoader />;
  if (!a) return null;
  const locked = a.review?.is_final || a.paper_status === "accepted" || a.paper_status === "rejected";
  const set = (k: string, v: any) => setF((x: any) => ({ ...x, [k]: v }));
  const avg = CRITERIA.reduce((s, c) => s + f[c.key], 0) / CRITERIA.length;

  const save = async (final: boolean) => {
    setSaving(true);
    const body: any = { strengths: f.strengths || null, weaknesses: f.weaknesses || null, comments: f.comments || null, confidential_comments: f.confidential_comments || null, recommendation: f.recommendation, is_final: final };
    CRITERIA.forEach((c) => { body[c.key] = final || f.touched[c.key] ? f[c.key] : null; });
    try { await api.put(`/reviewer/assignments/${a.id}/review`, body); toast(final ? "Review submitted. Thank you!" : "Draft saved"); setConfirm(false); reload(); }
    catch (e: any) { toast(e.message, "error"); setConfirm(false); } finally { setSaving(false); }
  };
  const base = `/reviewer/assignments/${a.id}/download`;

  return (
    <>
      <Link to="/reviewer/assignments" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-navy"><ArrowLeft className="h-4 w-4" />Back to assignments</Link>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3 animate-fadeUp">
        <div><p className="text-sm font-semibold" style={{ color: "var(--a1)" }}>{a.paper_code} · version {a.current_version}</p><h1 className="text-2xl font-bold md:text-3xl">{a.title}</h1>
          <p className="mt-1 text-sm text-slate-500">{a.track} · Due {fmtDate(a.due_date)}</p></div>
        <StatusBadge status={a.review_state} />
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <div className="space-y-4">
          <Tabs value={tab} onChange={setTab} tabs={[{ id: "paper", label: "Paper PDF" }, { id: "abstract", label: "Abstract & info" }]} />
          {tab === "paper" ? <PdfViewer path={`${base}?version=${a.current_version}`} filename={`${a.paper_code}_v${a.current_version}.pdf`} height="75vh" /> : (
            <Card className="space-y-4 p-6 text-sm"><div><p className="label">Abstract</p><p className="whitespace-pre-wrap leading-relaxed">{a.abstract}</p></div><div><p className="label">Keywords</p><p>{a.keywords || "—"}</p></div>
              <p className="flex items-center gap-2 rounded-xl bg-plum-100 px-3 py-2 text-xs text-plum-700"><Lock className="h-3.5 w-3.5" />Author details are hidden — this is a double-blind review.</p></Card>)}
          {a.previous_reviews?.map((r) => <ReviewCard key={r.id} review={r} heading={`Your earlier review (v${r.version_no})`} confidential />)}
        </div>

        <div>
          {locked && a.review ? <ReviewCard review={a.review} heading="Your submitted review" confidential /> : (
            <Card>
              <CardHeader title="Evaluation" subtitle="Score each criterion from 1 (poor) to 10 (excellent)" />
              <div className="space-y-6 p-5">
                <div className="space-y-5">{CRITERIA.map((c) => (
                  <div key={c.key}><div className="mb-1 flex items-center justify-between"><div><p className="text-sm font-semibold text-navy">{c.label}</p><p className="text-xs text-slate-400">{c.hint}</p></div>
                    <span className="grid h-9 w-11 place-items-center rounded-lg font-display text-lg font-bold text-white" style={{ backgroundImage: "linear-gradient(135deg,var(--a1),var(--a2))" }}>{f[c.key]}</span></div>
                    <input type="range" min={1} max={10} value={f[c.key]} className="w-full" onChange={(e) => setF((x: any) => ({ ...x, [c.key]: +e.target.value, touched: { ...x.touched, [c.key]: true } }))} />
                    <div className="flex justify-between text-[10px] text-slate-400"><span>1</span><span>5</span><span>10</span></div></div>))}
                  <p className="rounded-xl bg-[color:var(--a-soft)] px-4 py-3 text-sm font-semibold text-navy">Overall average: {avg.toFixed(1)} / 10</p></div>
                <Field label="Strengths"><Textarea rows={3} value={f.strengths} onChange={(e) => set("strengths", e.target.value)} placeholder="What does this paper do well?" /></Field>
                <Field label="Weaknesses"><Textarea rows={3} value={f.weaknesses} onChange={(e) => set("weaknesses", e.target.value)} placeholder="What needs to improve?" /></Field>
                <Field label="Detailed comments for the authors"><Textarea rows={6} value={f.comments} onChange={(e) => set("comments", e.target.value)} /></Field>
                <Field label="Confidential comments to the organisers" hint="Never shown to authors"><Textarea rows={3} value={f.confidential_comments} onChange={(e) => set("confidential_comments", e.target.value)} /></Field>
                <div><p className="label">Recommendation</p><div className="grid grid-cols-2 gap-2.5">{RECS.map((r) => (
                  <button key={r.v} type="button" onClick={() => set("recommendation", r.v)} className={cn("rounded-xl border-2 p-3 text-left transition", f.recommendation === r.v ? r.c + " shadow" : "border-slate-200 hover:border-slate-300")}>
                    <p className="text-sm font-semibold">{r.l}</p><p className="text-xs opacity-70">{r.d}</p></button>))}</div></div>
                <div className="flex flex-wrap gap-3 border-t border-slate-100 pt-5">
                  <Button variant="secondary" loading={saving} icon={<Save className="h-4 w-4" />} onClick={() => save(false)}>Save draft</Button>
                  <Button loading={saving} icon={<Send className="h-4 w-4" />} onClick={() => setConfirm(true)}>Submit final review</Button></div>
              </div>
            </Card>)}
        </div>
      </div>
      <ConfirmModal open={confirm} onClose={() => setConfirm(false)} loading={saving} onConfirm={() => save(true)} title="Submit final review?" confirmLabel="Submit review"
        text="Once submitted, your review cannot be edited. Make sure all scores, comments and your recommendation are final." />
    </>
  );
}
