import { CheckCircle2, FileUp, UploadCloud, X } from "lucide-react";
import { DragEvent, FormEvent, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button, Card, Field, Input, PageHeader, Select, Textarea, useToast, cn } from "../../components/ui";
import { api } from "../../lib/api";
import { fmtSize } from "../../lib/format";
import { useFetch } from "../../lib/hooks";
import { Track } from "../../lib/types";

export default function Submit() {
  const { data: site } = useFetch<{ settings: any; tracks: Track[] }>("/public/site");
  const toast = useToast(); const nv = useNavigate();
  const [f, setF] = useState({ title: "", abstract: "", keywords: "", co_authors: "", track_id: "" });
  const [file, setFile] = useState<File | null>(null);
  const [drag, setDrag] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ id: number; paper_code: string } | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const set = (k: string) => (e: any) => setF({ ...f, [k]: e.target.value });

  const pick = (x?: File | null) => {
    if (!x) return;
    if (!x.name.toLowerCase().endsWith(".pdf")) return toast("Only PDF files are accepted", "error");
    if (x.size > 10 * 1024 * 1024) return toast("File must be 10 MB or smaller", "error");
    setFile(x);
  };
  const onDrop = (e: DragEvent) => { e.preventDefault(); setDrag(false); pick(e.dataTransfer.files?.[0]); };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!file) return toast("Please attach your paper as a PDF", "error");
    setBusy(true);
    try {
      const fd = new FormData(); Object.entries(f).forEach(([k, v]) => fd.append(k, v)); fd.append("file", file);
      setDone(await api.upload("/author/papers", fd));
    } catch (err: any) { toast(err.message, "error"); } finally { setBusy(false); }
  };

  if (done) return (
    <Card className="mx-auto mt-6 max-w-xl p-10 text-center animate-pop">
      <div className="mx-auto mb-5 grid h-20 w-20 place-items-center rounded-full bg-emerald-50 text-emerald-600"><CheckCircle2 className="h-10 w-10" /></div>
      <h2 className="text-2xl font-bold">Paper submitted!</h2><p className="mt-2 text-slate-500">Your unique Paper ID is</p>
      <p className="mx-auto mt-2 inline-block rounded-2xl bg-gradient-to-r from-royal to-electric px-6 py-3 font-display text-3xl font-bold text-white shadow-glow">{done.paper_code}</p>
      <p className="mt-4 text-sm text-slate-500">Quote this ID in any correspondence. The organisers will assign reviewers soon.</p>
      <div className="mt-6 flex justify-center gap-3"><Button onClick={() => nv(`/author/papers/${done.id}`)}>View paper</Button><Link to="/author/papers" className="btn btn-secondary">All papers</Link></div>
    </Card>);

  const open = site?.settings?.submissions_open ?? true;
  return (
    <>
      <PageHeader title="Submit a Paper" subtitle="Upload your manuscript as a single PDF (max 10 MB). Remove author names for double-blind review." />
      {!open && <Card className="mb-6 border-red-200 bg-red-50 p-4 text-sm text-red-700">Paper submissions are currently closed.</Card>}
      <form onSubmit={submit} className="grid gap-6 lg:grid-cols-3">
        <Card className="space-y-5 p-6 lg:col-span-2">
          <Field label="Paper title"><Input required minLength={5} maxLength={500} value={f.title} onChange={set("title")} placeholder="Full title of your paper" /></Field>
          <Field label="Technical track"><Select required value={f.track_id} onChange={set("track_id")}><option value="">Select a track…</option>{site?.tracks.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</Select></Field>
          <Field label="Abstract" hint={`${f.abstract.length} characters · minimum 50`}><Textarea required minLength={50} rows={8} value={f.abstract} onChange={set("abstract")} placeholder="Summarise the problem, method and key findings" /></Field>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Keywords" hint="Comma separated"><Input value={f.keywords} onChange={set("keywords")} placeholder="deep learning, IoT, security" /></Field>
            <Field label="Co-authors" hint="Names & affiliations (optional)"><Input value={f.co_authors} onChange={set("co_authors")} /></Field>
          </div>
        </Card>
        <div className="space-y-6">
          <Card className="p-6">
            <p className="label">Paper PDF</p>
            <div onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)} onDrop={onDrop} onClick={() => input.current?.click()}
              className={cn("grid cursor-pointer place-items-center rounded-2xl border-2 border-dashed px-4 py-10 text-center transition", drag ? "border-royal bg-blue-50" : "border-slate-300 hover:border-royal hover:bg-blue-50/40")}>
              <input ref={input} type="file" accept="application/pdf,.pdf" hidden onChange={(e) => pick(e.target.files?.[0])} />
              {file ? <div className="flex w-full items-center gap-3 text-left"><FileUp className="h-8 w-8 shrink-0 text-royal" /><div className="min-w-0 flex-1"><p className="truncate font-medium text-navy">{file.name}</p><p className="text-xs text-slate-400">{fmtSize(file.size)}</p></div>
                <button type="button" onClick={(e) => { e.stopPropagation(); setFile(null); }} className="rounded-lg p-1.5 hover:bg-slate-100" aria-label="Remove"><X className="h-4 w-4" /></button></div>
                : <><UploadCloud className="h-10 w-10 text-royal" /><p className="mt-2 font-medium text-navy">Drop your PDF here</p><p className="text-xs text-slate-400">or click to browse</p></>}
            </div>
          </Card>
          <Button type="submit" size="lg" className="w-full" loading={busy} disabled={!open}>Submit paper</Button>
        </div>
      </form>
    </>
  );
}
