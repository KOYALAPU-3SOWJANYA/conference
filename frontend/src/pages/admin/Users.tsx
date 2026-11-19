import { Check, Plus, Power, Search, X } from "lucide-react";
import { FormEvent, useState } from "react";
import { Button, Card, Empty, ErrorBox, Field, Input, Modal, PageHeader, PageLoader, StatusBadge, TableWrap, Tabs, Textarea, useToast } from "../../components/ui";
import { api } from "../../lib/api";
import { fmtDate } from "../../lib/format";
import { useFetch } from "../../lib/hooks";
import { User } from "../../lib/types";

export default function AdminUsers({ role }: { role: "author" | "reviewer" }) {
  const [q, setQ] = useState(""); const [tab, setTab] = useState<"all" | "pending" | "inactive">("all");
  const { data, error, loading, reload } = useFetch<User[]>(`/admin/users?role=${role}&q=${encodeURIComponent(q)}`, { poll: 10000 });
  const toast = useToast();
  const [add, setAdd] = useState(false); const [busy, setBusy] = useState(false);
  const [f, setF] = useState({ name: "", email: "", password: "", affiliation: "", expertise: "", phone: "" });
  const set = (k: string) => (e: any) => setF({ ...f, [k]: e.target.value });
  const all = data ?? [];
  const rows = all.filter((u) => tab === "all" || (tab === "pending" ? u.approval_status === "pending" : !u.is_active));
  const patch = async (u: User, body: any, msg: string) => { try { await api.patch(`/admin/users/${u.id}`, body); toast(msg); reload(); } catch (e: any) { toast(e.message, "error"); } };
  const create = async (e: FormEvent) => {
    e.preventDefault(); setBusy(true);
    try { await api.post("/admin/users", { role, ...f }); toast(`${role} account created`); setAdd(false); setF({ name: "", email: "", password: "", affiliation: "", expertise: "", phone: "" }); reload(); }
    catch (err: any) { toast(err.message, "error"); } finally { setBusy(false); }
  };
  const R = role === "reviewer";
  return (
    <>
      <PageHeader title={R ? "Reviewers" : "Authors"} subtitle={R ? "Approve applications and monitor workload" : "Registered authors and their submissions"} action={<Button icon={<Plus className="h-4 w-4" />} onClick={() => setAdd(true)}>Add {role}</Button>} />
      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 p-4">
          <Tabs value={tab} onChange={setTab} tabs={[{ id: "all", label: "All", count: all.length }, ...(R ? [{ id: "pending" as const, label: "Pending approval", count: all.filter((u) => u.approval_status === "pending").length }] : []), { id: "inactive", label: "Deactivated", count: all.filter((u) => !u.is_active).length }]} />
          <div className="relative ml-auto min-w-[220px] flex-1 sm:max-w-xs"><Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" /><Input className="pl-9" placeholder="Search name, email, institution" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        </div>
        {error && <div className="p-4"><ErrorBox message={error} retry={reload} /></div>}
        {loading && !data ? <PageLoader /> : !rows.length ? <Empty title={`No ${role}s found`} /> : (
          <TableWrap><thead><tr><th>Name</th><th>Affiliation</th>{R && <th>Expertise</th>}<th>{R ? "Workload" : "Papers"}</th><th>Status</th><th>Joined</th><th className="text-right">Actions</th></tr></thead>
            <tbody>{rows.map((u) => (<tr key={u.id}>
              <td><p className="font-semibold text-navy">{u.name}</p><p className="text-xs text-slate-400">{u.email}</p></td><td className="max-w-[200px] truncate text-slate-600">{u.affiliation || "—"}</td>
              {R && <td className="max-w-[220px] truncate text-slate-500" title={u.expertise ?? ""}>{u.expertise || "—"}</td>}
              <td>{R ? `${u.completed}/${u.assigned} done` : u.papers}</td>
              <td><div className="flex flex-wrap gap-1">{R && <StatusBadge status={u.approval_status} />}<StatusBadge status={u.is_active ? "active" : "inactive"} /></div></td><td className="text-slate-500">{fmtDate(u.created_at)}</td>
              <td><div className="flex justify-end gap-1.5">
                {R && u.approval_status !== "approved" && <Button size="sm" variant="success" icon={<Check className="h-3.5 w-3.5" />} onClick={() => patch(u, { approval_status: "approved" }, "Reviewer approved")}>Approve</Button>}
                {R && u.approval_status === "pending" && <Button size="sm" variant="secondary" icon={<X className="h-3.5 w-3.5" />} onClick={() => patch(u, { approval_status: "rejected" }, "Application rejected")}>Reject</Button>}
                <Button size="sm" variant="ghost" icon={<Power className="h-3.5 w-3.5" />} onClick={() => patch(u, { is_active: !u.is_active }, u.is_active ? "Account deactivated" : "Account activated")}>{u.is_active ? "Deactivate" : "Activate"}</Button></div></td></tr>))}</tbody></TableWrap>)}
      </Card>
      <Modal open={add} onClose={() => setAdd(false)} title={`Add ${role}`} footer={<><Button variant="secondary" onClick={() => setAdd(false)}>Cancel</Button><Button form="add-user" type="submit" loading={busy}>Create account</Button></>}>
        <form id="add-user" onSubmit={create} className="space-y-4">
          <Field label="Full name"><Input required value={f.name} onChange={set("name")} /></Field><Field label="Email"><Input type="email" required value={f.email} onChange={set("email")} /></Field>
          <Field label="Temporary password" hint="8+ characters; ask the user to change it after signing in"><Input type="password" required minLength={8} value={f.password} onChange={set("password")} /></Field>
          <Field label="Affiliation"><Input value={f.affiliation} onChange={set("affiliation")} /></Field>
          {R && <Field label="Areas of expertise"><Textarea rows={2} value={f.expertise} onChange={set("expertise")} /></Field>}
        </form>
      </Modal>
    </>
  );
}
