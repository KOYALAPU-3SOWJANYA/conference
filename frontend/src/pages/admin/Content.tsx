import { Pencil, Plus, Save, Trash2 } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { Button, Card, CardHeader, ConfirmModal, Empty, ErrorBox, Field, Input, Modal, PageHeader, PageLoader, Select, Switch, TableWrap, Tabs, Textarea, useToast } from "../../components/ui";
import { api } from "../../lib/api";
import { fmtDate } from "../../lib/format";
import { useFetch } from "../../lib/hooks";
import { ImportantDate, SiteSettings, Track } from "../../lib/types";

/* ---------- reusable CRUD manager ---------- */
function Crud<T extends { id: number }>({ path, title, columns, fields, blank, toForm }: {
  path: string; title: string; columns: { h: string; r: (x: T) => any }[];
  fields: { k: string; l: string; type?: string; area?: boolean; options?: string[]; required?: boolean }[]; blank: any; toForm?: (x: T) => any;
}) {
  const { data, error, loading, reload } = useFetch<T[]>(`/admin/${path}`);
  const toast = useToast();
  const [edit, setEdit] = useState<any | null>(null); const [del, setDel] = useState<T | null>(null); const [busy, setBusy] = useState(false);
  const save = async (e: FormEvent) => {
    e.preventDefault(); setBusy(true);
    const body = { ...edit }; delete body.id;
    ["sort_order"].forEach((k) => { if (k in body) body[k] = Number(body[k]) || 0; });
    try { edit.id ? await api.put(`/admin/${path}/${edit.id}`, body) : await api.post(`/admin/${path}`, body); toast("Saved"); setEdit(null); reload(); }
    catch (err: any) { toast(err.message, "error"); } finally { setBusy(false); }
  };
  const remove = async () => { if (!del) return; setBusy(true); try { await api.del(`/admin/${path}/${del.id}`); toast("Deleted"); setDel(null); reload(); } catch (e: any) { toast(e.message, "error"); setDel(null); } finally { setBusy(false); } };
  return (
    <Card>
      <CardHeader title={title} action={<Button size="sm" icon={<Plus className="h-4 w-4" />} onClick={() => setEdit({ ...blank })}>Add</Button>} />
      {error && <div className="p-4"><ErrorBox message={error} retry={reload} /></div>}
      {loading && !data ? <PageLoader /> : !data?.length ? <Empty title="Nothing here yet" /> : (
        <TableWrap><thead><tr>{columns.map((c) => <th key={c.h}>{c.h}</th>)}<th /></tr></thead>
          <tbody>{data.map((x) => (<tr key={x.id}>{columns.map((c) => <td key={c.h} className="max-w-[280px] truncate">{c.r(x)}</td>)}
            <td><div className="flex justify-end gap-1"><Button size="sm" variant="ghost" icon={<Pencil className="h-3.5 w-3.5" />} onClick={() => setEdit(toForm ? toForm(x) : { ...x })}>Edit</Button>
              <Button size="sm" variant="ghost" icon={<Trash2 className="h-3.5 w-3.5 text-red-500" />} onClick={() => setDel(x)} aria-label="Delete" /></div></td></tr>))}</tbody></TableWrap>)}
      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? `Edit ${title}` : `Add ${title}`} footer={<><Button variant="secondary" onClick={() => setEdit(null)}>Cancel</Button><Button form="crud-form" type="submit" loading={busy}>Save</Button></>}>
        {edit && <form id="crud-form" onSubmit={save} className="space-y-4">{fields.map((f) => (
          <Field key={f.k} label={f.l}>{f.area ? <Textarea rows={3} value={edit[f.k] ?? ""} onChange={(e) => setEdit({ ...edit, [f.k]: e.target.value })} />
            : f.options ? <Select value={edit[f.k] ?? ""} onChange={(e) => setEdit({ ...edit, [f.k]: e.target.value })}>{f.options.map((o) => <option key={o} value={o}>{o || "None"}</option>)}</Select>
            : <Input required={f.required} type={f.type ?? "text"} value={edit[f.k] ?? ""} onChange={(e) => setEdit({ ...edit, [f.k]: e.target.value })} />}</Field>))}</form>}
      </Modal>
      <ConfirmModal open={!!del} onClose={() => setDel(null)} onConfirm={remove} loading={busy} danger title="Delete this item?" confirmLabel="Delete" text="This will immediately update the public website." />
    </Card>
  );
}

/* ---------- conference info ---------- */
function InfoForm() {
  const { data, error, loading, reload } = useFetch<SiteSettings>("/admin/settings");
  const toast = useToast(); const [f, setF] = useState<any>(null); const [busy, setBusy] = useState(false);
  useEffect(() => { if (data) setF({ ...data, objectives: data.objectives.join("\n"), guidelines: data.guidelines.join("\n"), registration_fees: (data.registration_fees ?? []).join("\n") }); }, [data]);
  if (error) return <ErrorBox message={error} retry={reload} />;
  if (loading || !f) return <PageLoader />;
  const set = (k: string) => (e: any) => setF({ ...f, [k]: e.target.value });
  const save = async (e: FormEvent) => {
    e.preventDefault(); setBusy(true);
    try { await api.put("/admin/settings", { ...f, objectives: f.objectives.split("\n"), guidelines: f.guidelines.split("\n"), registration_fees: f.registration_fees.split("\n") }); toast("Conference information saved"); reload(); }
    catch (err: any) { toast(err.message, "error"); } finally { setBusy(false); }
  };
  return (
    <form onSubmit={save} className="grid gap-6 lg:grid-cols-2">
      <Card><CardHeader title="Identity & schedule" /><div className="grid gap-4 p-5 sm:grid-cols-2">
        <Field label="Conference name"><Input value={f.conference_name} onChange={set("conference_name")} /></Field><Field label="Subtitle"><Input value={f.subtitle} onChange={set("subtitle")} /></Field>
        <Field label="Full name" className="sm:col-span-2"><Input value={f.full_name} onChange={set("full_name")} /></Field><Field label="Tagline" className="sm:col-span-2"><Input value={f.tagline} onChange={set("tagline")} /></Field>
        <Field label="Start date"><Input type="date" value={f.start_date} onChange={set("start_date")} /></Field><Field label="End date"><Input type="date" value={f.end_date} onChange={set("end_date")} /></Field>
        <Field label="Submission deadline"><Input type="date" value={f.submission_deadline} onChange={set("submission_deadline")} /></Field>
        <div className="flex items-end pb-2"><Switch checked={!!f.submissions_open} onChange={(v) => setF({ ...f, submissions_open: v })} label="Accepting submissions" /></div>
        <Field label="Venue" className="sm:col-span-2"><Input value={f.venue} onChange={set("venue")} /></Field>
        <Field label="Organiser"><Input value={f.organizer} onChange={set("organizer")} /></Field><Field label="Institution"><Input value={f.institution_name} onChange={set("institution_name")} /></Field></div></Card>
      <Card><CardHeader title="Contact details" /><div className="grid gap-4 p-5"><Field label="Email"><Input type="email" value={f.contact_email} onChange={set("contact_email")} /></Field><Field label="Phone"><Input value={f.contact_phone} onChange={set("contact_phone")} /></Field><Field label="Address"><Textarea rows={3} value={f.contact_address} onChange={set("contact_address")} /></Field>
        <Field label="Contact person"><Input value={f.contact_person ?? ""} onChange={set("contact_person")} /></Field><Field label="Paper submission link" hint="Leave empty to use the built-in submission page of this site"><Input type="url" placeholder="https://..." value={f.submission_link ?? ""} onChange={set("submission_link")} /></Field><Field label="Conference website"><Input value={f.website ?? ""} onChange={set("website")} /></Field></div></Card>
      <Card><CardHeader title="Registration & publication" subtitle="Fees: one per line as  Category | Amount" /><div className="grid gap-4 p-5"><Field label="Registration fees"><Textarea rows={5} value={f.registration_fees} onChange={set("registration_fees")} /></Field><Field label="Registration form link"><Input value={f.registration_link ?? ""} onChange={set("registration_link")} /></Field><Field label="Publication note"><Textarea rows={2} value={f.publication_note ?? ""} onChange={set("publication_note")} /></Field></div></Card>
      <Card><CardHeader title="About the conference" /><div className="p-5"><Textarea rows={7} value={f.about_conference} onChange={set("about_conference")} /></div></Card>
      <Card><CardHeader title="About the institution" /><div className="p-5"><Textarea rows={7} value={f.about_institution} onChange={set("about_institution")} /></div></Card>
      <Card><CardHeader title="Objectives" subtitle="One per line" /><div className="p-5"><Textarea rows={8} value={f.objectives} onChange={set("objectives")} /></div></Card>
      <Card><CardHeader title="Submission guidelines" subtitle="One per line" /><div className="p-5"><Textarea rows={8} value={f.guidelines} onChange={set("guidelines")} /></div></Card>
      <div className="lg:col-span-2"><Button type="submit" size="lg" loading={busy} icon={<Save className="h-4 w-4" />}>Save all changes</Button></div>
    </form>
  );
}

export default function Content() {
  const [tab, setTab] = useState<"info" | "tracks" | "dates">("info");
  return (
    <>
      <PageHeader title="Conference Content" subtitle="Everything here powers the public website — changes go live instantly" />
      <div className="mb-6"><Tabs value={tab} onChange={setTab} tabs={[{ id: "info", label: "Conference info" }, { id: "tracks", label: "Technical tracks" }, { id: "dates", label: "Important dates" }]} /></div>
      {tab === "info" && <InfoForm />}
      {tab === "tracks" && <Crud<Track> key="t" path="tracks" title="Track" blank={{ name: "", description: "", icon: "", sort_order: 0 }}
        columns={[{ h: "Order", r: (x) => x.sort_order }, { h: "Track", r: (x) => <b className="text-navy">{x.name}</b> }, { h: "Description", r: (x) => x.description }]}
        fields={[{ k: "name", l: "Track name", required: true }, { k: "description", l: "Description", area: true }, { k: "icon", l: "Icon", options: ["", "brain", "database", "shield", "cpu", "cloud", "heart", "leaf", "flask"] }, { k: "sort_order", l: "Display order", type: "number" }]} />}
      {tab === "dates" && <Crud<ImportantDate> key="d" path="dates" title="Important date" blank={{ label: "", event_date: "", note: "", sort_order: 0 }}
        columns={[{ h: "Date", r: (x) => fmtDate(x.event_date) }, { h: "Event", r: (x) => <b className="text-navy">{x.label}</b> }, { h: "Note", r: (x) => x.note }]}
        fields={[{ k: "label", l: "Event", required: true }, { k: "event_date", l: "Date", type: "date", required: true }, { k: "note", l: "Note" }, { k: "sort_order", l: "Display order", type: "number" }]} />}
    </>
  );
}
