import { Check, Eye, RotateCcw, Search, X } from "lucide-react";
import { useState } from "react";
import { Button, Card, Empty, ErrorBox, Input, Modal, PageHeader, PageLoader, TableWrap, Tabs, Textarea, useToast } from "../../components/ui";
import { api } from "../../lib/api";
import { fmtDate } from "../../lib/format";
import { useFetch } from "../../lib/hooks";
import { Registration } from "../../lib/types";
import { StatusBadge } from "../../components/ui";

const PAY: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700 ring-amber-200", verified: "bg-emerald-50 text-emerald-700 ring-emerald-200", rejected: "bg-red-50 text-red-700 ring-red-200",
};
const PayBadge = ({ s }: { s: string }) => <span className={`badge ${PAY[s] ?? PAY.pending}`}><span className="h-1.5 w-1.5 rounded-full bg-current" />{s === "pending" ? "Pending verification" : s[0].toUpperCase() + s.slice(1)}</span>;

export default function Registrations() {
  const { data, error, loading, reload } = useFetch<Registration[]>("/admin/registrations", { poll: 10000 });
  const toast = useToast();
  const [tab, setTab] = useState<"all" | "pending" | "verified" | "rejected">("all");
  const [q, setQ] = useState("");
  const [view, setView] = useState<Registration | null>(null);
  const [note, setNote] = useState("");
  const all = data ?? [];
  const ql = q.trim().toLowerCase();
  const rows = all.filter((r) => (tab === "all" || r.payment_status === tab)
    && (!ql || [r.name, r.email, r.reg_code, r.paper_code, r.paper_title, r.upi_reference, r.organization].some((v) => (v ?? "").toLowerCase().includes(ql))));
  const total = all.filter((r) => r.payment_status === "verified").reduce((a, r) => a + r.amount, 0);

  const setStatus = async (r: Registration, payment_status: string) => {
    try { const u = await api.patch<Registration>(`/admin/registrations/${r.id}`, { payment_status, admin_note: view?.id === r.id ? note : undefined }); toast(`Payment ${payment_status}`); if (view?.id === r.id) setView(u); reload(); }
    catch (e: any) { toast(e.message, "error"); }
  };
  const open = (r: Registration) => { setView(r); setNote(r.admin_note ?? ""); };

  return (<>
    <PageHeader title="Registrations" subtitle={`Verified collection: Rs. ${total.toLocaleString("en-IN")} · verify each UPI reference against your bank statement`} />
    <Card>
      <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 p-4">
        <Tabs value={tab} onChange={setTab} tabs={[{ id: "all", label: "All", count: all.length }, { id: "pending", label: "Pending", count: all.filter((r) => r.payment_status === "pending").length },
          { id: "verified", label: "Verified", count: all.filter((r) => r.payment_status === "verified").length }, { id: "rejected", label: "Rejected", count: all.filter((r) => r.payment_status === "rejected").length }]} />
        <div className="relative ml-auto min-w-[220px] flex-1 sm:max-w-xs"><Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" /><Input className="pl-9" placeholder="Search name, paper ID, UPI ref…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
      </div>
      {error && <div className="p-4"><ErrorBox message={error} retry={reload} /></div>}
      {loading && !data ? <PageLoader /> : !rows.length ? <Empty title="No registrations yet" /> : (
        <TableWrap><thead><tr><th>Reg. ID</th><th>Participant</th><th>Paper ID / title</th><th>Category</th><th>UPI reference</th><th>Status</th><th>Date</th><th className="text-right">Actions</th></tr></thead>
          <tbody>{rows.map((r) => (<tr key={r.id}>
            <td className="font-semibold text-navy">{r.reg_code}</td>
            <td><p className="font-semibold text-navy">{r.name}</p><p className="text-xs text-slate-400">{r.email} · {r.mobile}</p></td>
            <td className="max-w-[240px]">{r.paper_code ? <><p className="font-medium text-royal">{r.paper_code}</p><p className="truncate text-xs text-slate-500" title={r.paper_title ?? ""}>{r.paper_title}</p>{r.paper_status && <StatusBadge status={r.paper_status} />}</> : <span className="text-slate-400">No paper (attendee)</span>}</td>
            <td><p>{r.category}</p><p className="text-xs text-slate-400">Rs. {r.amount}</p></td>
            <td className="font-mono text-xs">{r.upi_reference}</td>
            <td><PayBadge s={r.payment_status} /></td><td className="text-slate-500">{fmtDate(r.created_at)}</td>
            <td><div className="flex justify-end gap-1.5">
              <Button size="sm" variant="ghost" icon={<Eye className="h-3.5 w-3.5" />} onClick={() => open(r)}>Details</Button>
              {r.payment_status !== "verified" && <Button size="sm" variant="success" icon={<Check className="h-3.5 w-3.5" />} onClick={() => setStatus(r, "verified")}>Verify</Button>}
              {r.payment_status === "pending" && <Button size="sm" variant="secondary" icon={<X className="h-3.5 w-3.5" />} onClick={() => setStatus(r, "rejected")}>Reject</Button>}
              {r.payment_status === "rejected" && <Button size="sm" variant="ghost" icon={<RotateCcw className="h-3.5 w-3.5" />} onClick={() => setStatus(r, "pending")}>Reopen</Button>}
            </div></td></tr>))}</tbody></TableWrap>)}
    </Card>

    <Modal open={!!view} onClose={() => setView(null)} title={view ? `Registration ${view.reg_code}` : ""} size="lg"
      footer={view && <><Button variant="secondary" onClick={() => setView(null)}>Close</Button>
        {view.payment_status !== "rejected" && <Button variant="secondary" onClick={() => setStatus(view, "rejected")}>Reject payment</Button>}
        {view.payment_status !== "verified" && <Button variant="success" onClick={() => setStatus(view, "verified")}>Verify payment</Button>}</>}>
      {view && <div className="space-y-4 text-sm">
        <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
          {([["Name", view.name], ["Designation", view.designation], ["Organization", view.organization], ["Mobile No", view.mobile], ["E-mail ID", view.email], ["Category", `${view.category} (Rs. ${view.amount})`],
            ["Paper ID", view.paper_code ?? "—"], ["Paper title", view.paper_title ?? "—"], ["UPI Reference Number", view.upi_reference], ["Submitted", fmtDate(view.created_at)]] as [string, string][]).map(([k, v]) => (
            <div key={k}><dt className="text-xs font-semibold uppercase text-slate-400">{k}</dt><dd className="font-medium text-navy">{v}</dd></div>))}
          <div className="sm:col-span-2"><dt className="text-xs font-semibold uppercase text-slate-400">Address</dt><dd className="whitespace-pre-line font-medium text-navy">{view.address}</dd></div>
        </dl>
        <div><p className="mb-1 text-xs font-semibold uppercase text-slate-400">Internal note (saved with the next Verify / Reject)</p><Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} /></div>
      </div>}
    </Modal>
  </>);
}
