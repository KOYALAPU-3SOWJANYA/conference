import { ArrowDown, ArrowUp, ImagePlus, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { groupRank, isPatronGroup, SpeakerPhoto, STANDARD_GROUPS } from "../../components/Speakers";
import { Button, Card, ConfirmModal, Empty, ErrorBox, Field, Input, Modal, PageHeader, PageLoader, Select, useToast } from "../../components/ui";
import { api } from "../../lib/api";
import { useFetch } from "../../lib/hooks";
import { Member, Speaker } from "../../lib/types";

/** One row type for both tables: speakers (keynote / invited) and committee members (any group). */
type Person = { src: "speaker" | "committee"; id: number; section: string; name: string; designation: string; more: string; sort_order: number; photo_url: string | null };
type Form = Person & { choice: string; newGroup: string };

const SPEAKER_TITLES: Record<string, string> = { keynote: "Keynote address", invited: "Invited speakers" };
const NEW_GROUP = "newgroup";

/** Shrink the chosen photo in the browser (max 800 px, JPEG) so uploads stay small and always valid. */
async function shrink(file: File): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, 800 / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * scale); c.height = Math.round(bmp.height * scale);
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, c.width, c.height); ctx.drawImage(bmp, 0, 0, c.width, c.height);
  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("Could not read that image"))), "image/jpeg", 0.88));
}

const fromSpeaker = (s: Speaker): Person => ({ src: "speaker", id: s.id, section: s.kind, name: s.name, designation: s.designation, more: s.details, sort_order: s.sort_order, photo_url: s.photo_url });
const fromMember = (m: Member): Person => ({ src: "committee", id: m.id, section: m.group, name: m.name, designation: m.designation ?? "", more: m.affiliation ?? "", sort_order: m.sort_order, photo_url: m.photo_url ?? null });
const apiPath = (p: Pick<Person, "src">) => (p.src === "speaker" ? "/admin/speakers" : "/admin/committees");
const body = (p: Person, group: string, order?: number) => p.src === "speaker"
  ? { kind: group, name: p.name, designation: p.designation, details: p.more, sort_order: order }
  : { group, name: p.name, designation: p.designation, affiliation: p.more, sort_order: order ?? 999 };

export default function Speakers() {
  const sp = useFetch<Speaker[]>("/public/speakers");
  const cm = useFetch<Member[]>("/admin/committees");
  const toast = useToast();
  const [form, setForm] = useState<Form | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [removePhoto, setRemovePhoto] = useState(false);
  const [busy, setBusy] = useState(false);
  const [del, setDel] = useState<Person | null>(null);
  const [askLoad, setAskLoad] = useState(false);
  const [q, setQ] = useState("");
  const pick = useRef<HTMLInputElement>(null);
  const reload = () => { sp.reload(); cm.reload(); };

  const people = useMemo(() => [...(sp.data ?? []).map(fromSpeaker), ...(cm.data ?? []).map(fromMember)], [sp.data, cm.data]);
  const ql = q.trim().toLowerCase();
  const match = (p: Person) => !ql || [p.name, p.designation, p.more].some((v) => v.toLowerCase().includes(ql));
  const groups = useMemo(() => [...new Set((cm.data ?? []).map((m) => m.group))].sort((a, b) => groupRank(a) - groupRank(b)), [cm.data]);
  const groupChoices = [...new Set([...STANDARD_GROUPS, ...groups])];

  // page order follows the brochure: patron groups, keynote, invited speakers, then the organizing-committee groups
  const sections: { key: string; title: string; src: "speaker" | "committee" }[] = [
    ...groups.filter(isPatronGroup).map((g) => ({ key: g, title: g, src: "committee" as const })),
    { key: "keynote", title: SPEAKER_TITLES.keynote, src: "speaker" }, { key: "invited", title: SPEAKER_TITLES.invited, src: "speaker" },
    ...groups.filter((g) => !isPatronGroup(g)).map((g) => ({ key: g, title: g, src: "committee" as const })),
  ];

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
  const openForm = (p?: Person) => {
    setForm(p ? { ...p, choice: p.src === "speaker" ? `speaker:${p.section}` : `group:${p.section}`, newGroup: "" }
      : { src: "speaker", id: 0, section: "invited", name: "", designation: "", more: "", sort_order: 0, photo_url: null, choice: "speaker:invited", newGroup: "" });
    setFile(null); setPreview(null); setRemovePhoto(false);
  };
  const set = (k: string) => (e: any) => setForm({ ...form!, [k]: e.target.value });
  const choose = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; e.target.value = "";
    if (!f) return;
    if (!/^image\//.test(f.type)) { toast("Please choose an image file", "error"); return; }
    setFile(f); setRemovePhoto(false); setPreview(URL.createObjectURL(f));
  };

  const save = async () => {
    if (!form || form.name.trim().length < 2) { toast("Enter the person's name", "error"); return; }
    const isSpeaker = form.choice.startsWith("speaker:");
    const target = isSpeaker ? form.choice.slice(8) : form.choice === NEW_GROUP ? form.newGroup.trim() : form.choice.slice(6);
    if (!isSpeaker && target.length < 2) { toast("Enter a name for the new group", "error"); return; }
    setBusy(true);
    try {
      const src = isSpeaker ? "speaker" : "committee";
      const p: Person = { ...form, src };
      const editing = form.id > 0;
      const payload = body(p, target, editing ? form.sort_order : undefined);
      const saved = editing ? await api.put<any>(`${apiPath(p)}/${form.id}`, payload) : await api.post<any>(apiPath(p), payload);
      if (file) { const fd = new FormData(); fd.append("file", await shrink(file), "photo.jpg"); await api.upload(`${apiPath(p)}/${saved.id}/photo`, fd); }
      else if (removePhoto && form.photo_url) await api.del(`${apiPath(p)}/${saved.id}/photo`);
      toast(editing ? "Saved" : "Added"); setForm(null); reload();
    } catch (e: any) { toast(e.message, "error"); } finally { setBusy(false); }
  };
  const remove = async () => {
    if (!del) return; setBusy(true);
    try { await api.del(`${apiPath(del)}/${del.id}`); toast("Deleted"); setDel(null); reload(); }
    catch (e: any) { toast(e.message, "error"); } finally { setBusy(false); }
  };
  const loadBrochure = async () => {
    setBusy(true);
    try { const r = await api.post<{ count: number }>("/admin/committees/load-brochure"); toast(`${r.count} committee members loaded`); setAskLoad(false); reload(); }
    catch (e: any) { toast(e.message, "error"); } finally { setBusy(false); }
  };
  const move = async (list: Person[], i: number, dir: -1 | 1) => {
    const j = i + dir; if (j < 0 || j >= list.length) return;
    const next = [...list]; [next[i], next[j]] = [next[j], next[i]];
    try {
      await Promise.all(next.map((p, idx) => (p.sort_order !== (idx + 1) * 10 ? api.put(`${apiPath(p)}/${p.id}`, body(p, p.section, (idx + 1) * 10)) : null)));
      reload();
    } catch (e: any) { toast(e.message, "error"); }
  };

  const section = (s: { key: string; title: string; src: "speaker" | "committee" }) => {
    const all = people.filter((p) => p.src === s.src && p.section === s.key);
    const list = all.filter(match);
    if (ql && !list.length) return null;
    return (
      <Card key={`${s.src}:${s.key}`} className="mb-6">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><h3 className="font-semibold text-navy">{s.title} <span className="text-sm font-normal text-slate-400">({all.length})</span></h3></div>
        {!list.length ? <Empty title="Nobody here yet" text="Use “Add person” to create one." /> : (
          <ul className="divide-y divide-slate-100">{list.map((p) => { const i = all.indexOf(p); return (
            <li key={p.id} className="flex flex-wrap items-center gap-4 px-5 py-3.5">
              <SpeakerPhoto s={p} className="h-14 w-14" rounded="rounded-xl" />
              <div className="min-w-0 flex-1"><p className="font-semibold text-navy">{p.name}</p>
                {(p.designation || p.more) && <p className="text-sm text-slate-600">{[p.designation, p.more].filter(Boolean).join(", ")}</p>}</div>
              <div className="flex items-center gap-1.5">
                <Button size="sm" variant="ghost" aria-label="Move up" disabled={!!ql || i === 0} onClick={() => move(all, i, -1)} icon={<ArrowUp className="h-4 w-4" />} />
                <Button size="sm" variant="ghost" aria-label="Move down" disabled={!!ql || i === all.length - 1} onClick={() => move(all, i, 1)} icon={<ArrowDown className="h-4 w-4" />} />
                <Button size="sm" variant="secondary" icon={<Pencil className="h-3.5 w-3.5" />} onClick={() => openForm(p)}>Edit</Button>
                <Button size="sm" variant="danger" icon={<Trash2 className="h-3.5 w-3.5" />} onClick={() => setDel(p)}>Delete</Button>
              </div>
            </li>); })}</ul>)}
      </Card>);
  };

  // what the modal shows: newly chosen photo > existing photo (unless being removed) > initials
  const modalPhoto = preview ?? (removePhoto ? null : form?.photo_url ?? null);
  const editing = !!form && form.id > 0;
  const loading = (sp.loading && !sp.data) || (cm.loading && !cm.data);
  return (<>
    <PageHeader title="Speakers & Committees" subtitle="Everyone shown on the home page and the Committees page · changes appear immediately"
      action={<div className="flex flex-wrap gap-2"><Button variant="secondary" onClick={() => setAskLoad(true)}>Load brochure committee list</Button><Button icon={<Plus className="h-4 w-4" />} onClick={() => openForm()}>Add person</Button></div>} />
    <div className="relative mb-6 max-w-sm"><Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" /><Input className="pl-9" placeholder="Search by name or designation…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
    {sp.error && <ErrorBox message={sp.error} retry={sp.reload} />}{cm.error && <ErrorBox message={cm.error} retry={cm.reload} />}
    {loading ? <PageLoader /> : <>
      {!groups.length && !ql && <Card className="mb-6 p-5 text-sm text-slate-600">No committee members yet. Click <b>Load brochure committee list</b> to add everyone from the NISE 2026 brochure at once, or use <b>Add person</b>.</Card>}
      {sections.map(section)}
    </>}

    <Modal open={!!form} onClose={() => !busy && setForm(null)} title={editing ? "Edit person" : "Add person"} size="lg"
      footer={<><Button variant="secondary" disabled={busy} onClick={() => setForm(null)}>Cancel</Button><Button loading={busy} onClick={save}>{editing ? "Save changes" : "Add person"}</Button></>}>
      {form && <div className="grid gap-5 sm:grid-cols-[auto_1fr]">
        <div className="text-center">
          <SpeakerPhoto s={{ name: form.name || "?", photo_url: modalPhoto }} className="mx-auto h-36 w-36" />
          <input ref={pick} type="file" accept="image/*" hidden onChange={choose} />
          <div className="mt-3 flex flex-col gap-2">
            <Button size="sm" variant="secondary" icon={<ImagePlus className="h-4 w-4" />} onClick={() => pick.current?.click()}>{modalPhoto ? "Change photo" : "Upload photo"}</Button>
            {modalPhoto && <Button size="sm" variant="ghost" icon={<X className="h-4 w-4" />} onClick={() => { setFile(null); setPreview(null); setRemovePhoto(true); }}>Remove photo</Button>}
          </div>
        </div>
        <div className="grid gap-4">
          <Field label="Section" hint="Where this person appears on the website">
            <Select value={form.choice} onChange={set("choice")}>
              {(!editing || form.src === "speaker") && <optgroup label="Speakers"><option value="speaker:keynote">Keynote address</option><option value="speaker:invited">Invited speaker</option></optgroup>}
              {(!editing || form.src === "committee") && <optgroup label="Committees">{groupChoices.map((g) => <option key={g} value={`group:${g}`}>{g}</option>)}<option value={NEW_GROUP}>+ New group…</option></optgroup>}
            </Select></Field>
          {form.choice === NEW_GROUP && <Field label="New group name"><Input value={form.newGroup} onChange={set("newGroup")} placeholder="e.g. Hospitality Committee" /></Field>}
          <Field label="Name"><Input required value={form.name} onChange={set("name")} placeholder="Prof. Dr. ..." /></Field>
          <Field label="Designation"><Input value={form.designation} onChange={set("designation")} placeholder="e.g. Professor, HoD, CSE" /></Field>
          <Field label="Organization / more information" hint="Shown after the designation"><Input value={form.more} onChange={set("more")} placeholder="e.g. GVPIHLR" /></Field>
        </div>
      </div>}
    </Modal>
    <ConfirmModal open={!!del} onClose={() => setDel(null)} onConfirm={remove} loading={busy} danger confirmLabel="Delete"
      title="Delete this person?" text={`“${del?.name}” will be removed from the website. This cannot be undone.`} />
    <ConfirmModal open={askLoad} onClose={() => setAskLoad(false)} onConfirm={loadBrochure} loading={busy} danger confirmLabel="Replace with brochure list"
      title="Load the brochure committee list?" text="This REPLACES every committee member currently listed (and their photos) with the people printed in the NISE 2026 brochure: Patrons, Advisory Committee, Chairs, Secretaries, Members and Technical Program Committee. Keynote and invited speakers are not affected." />
  </>);
}
