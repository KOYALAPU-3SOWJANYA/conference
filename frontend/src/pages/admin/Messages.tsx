import { Mail, Trash2 } from "lucide-react";
import { api } from "../../lib/api";
import { fmtDateTime } from "../../lib/format";
import { useFetch } from "../../lib/hooks";
import { Button, Card, Empty, ErrorBox, PageHeader, PageLoader, cn, useToast } from "../../components/ui";

interface Msg { id: number; name: string; email: string; subject: string; message: string; is_read: boolean; created_at: string }

export default function Messages() {
  const { data, error, loading, reload } = useFetch<Msg[]>("/admin/messages", { poll: 15000 });
  const toast = useToast();
  return (
    <>
      <PageHeader title="Contact Messages" subtitle="Enquiries sent from the public website" />
      {error && <ErrorBox message={error} retry={reload} />}
      {loading && !data ? <PageLoader /> : !data?.length ? <Card><Empty title="No messages" icon={<Mail className="h-7 w-7" />} /></Card> : (
        <div className="space-y-4">{data.map((m) => (
          <Card key={m.id} className={cn("p-5", !m.is_read && "border-l-4 border-l-electric")}>
            <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-semibold text-navy">{m.subject}</p><p className="text-xs text-slate-500">{m.name} · <a className="text-royal" href={`mailto:${m.email}`}>{m.email}</a> · {fmtDateTime(m.created_at)}</p></div>
              <div className="flex gap-2">{!m.is_read && <Button size="sm" variant="secondary" onClick={async () => { await api.post(`/admin/messages/${m.id}/read`); reload(); }}>Mark read</Button>}
                <Button size="sm" variant="ghost" icon={<Trash2 className="h-4 w-4" />} onClick={async () => { await api.del(`/admin/messages/${m.id}`); toast("Message deleted"); reload(); }}>Delete</Button></div></div>
            <p className="mt-3 whitespace-pre-wrap text-sm text-slate-700">{m.message}</p></Card>))}</div>)}
    </>
  );
}
