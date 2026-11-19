import { Bell, CheckCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { api } from "../../lib/api";
import { timeAgo } from "../../lib/format";
import { useFetch } from "../../lib/hooks";
import { Notice } from "../../lib/types";
import { Button, Card, Empty, ErrorBox, PageHeader, PageLoader, cn } from "../../components/ui";

export default function Notifications() {
  const { data, error, loading, reload } = useFetch<{ unread: number; items: Notice[] }>("/notifications", { poll: 8000 });
  const nv = useNavigate();
  const open = async (n: Notice) => { if (!n.is_read) await api.post(`/notifications/${n.id}/read`); reload(); if (n.link) nv(n.link); };
  return (
    <>
      <PageHeader title="Notifications" subtitle="Live activity on your papers, reviews and account"
        action={<Button variant="secondary" icon={<CheckCheck className="h-4 w-4" />} disabled={!data?.unread} onClick={async () => { await api.post("/notifications/read-all"); reload(); }}>Mark all as read</Button>} />
      {error && <ErrorBox message={error} retry={reload} />}
      {loading && !data ? <PageLoader /> : (
        <Card className="overflow-hidden">
          {!data?.items.length ? <Empty title="No notifications yet" text="Updates will appear here as things happen." icon={<Bell className="h-7 w-7" />} /> :
            data.items.map((n) => (
              <button key={n.id} onClick={() => open(n)} className={cn("flex w-full items-start gap-4 border-b border-slate-100 px-5 py-4 text-left transition last:border-0 hover:bg-slate-50", !n.is_read && "bg-[color:var(--a-soft)]")}>
                <span className="mt-1 grid h-9 w-9 shrink-0 place-items-center rounded-xl text-white" style={{ backgroundImage: "linear-gradient(135deg,var(--a1),var(--a2))" }}><Bell className="h-4 w-4" /></span>
                <span className="min-w-0 flex-1"><span className="block font-semibold text-navy">{n.title}</span><span className="block text-sm text-slate-600">{n.message}</span></span>
                <span className="shrink-0 text-xs text-slate-400">{timeAgo(n.created_at)}</span>
              </button>
            ))}
        </Card>
      )}
    </>
  );
}
