import { useState } from "react";
import ReviewCard from "../../components/ReviewCard";
import { Card, Empty, ErrorBox, Modal, PageHeader, PageLoader, StatusBadge, TableWrap } from "../../components/ui";
import { fmtDateTime } from "../../lib/format";
import { useFetch } from "../../lib/hooks";
import { Review } from "../../lib/types";

type H = Review & { assignment_id: number; paper_code: string; title: string; track: string | null; paper_status: string };

export default function ReviewerHistory() {
  const { data, error, loading, reload } = useFetch<H[]>("/reviewer/history", { poll: 15000 });
  const [open, setOpen] = useState<H | null>(null);
  return (
    <>
      <PageHeader title="Review History" subtitle="All reviews you have submitted" />
      {error && <ErrorBox message={error} retry={reload} />}
      {loading && !data ? <PageLoader /> : (
        <Card>{!data?.length ? <Empty title="No completed reviews yet" text="Submitted reviews will be listed here." /> : (
          <TableWrap><thead><tr><th>Paper ID</th><th>Title</th><th>Version</th><th>Score</th><th>Recommendation</th><th>Paper status</th><th>Submitted</th></tr></thead>
            <tbody>{data.map((r) => (<tr key={r.id} className="cursor-pointer" onClick={() => setOpen(r)}>
              <td className="font-semibold" style={{ color: "var(--a1)" }}>{r.paper_code}</td><td className="max-w-xs truncate font-medium text-navy">{r.title}</td><td>v{r.version_no}</td>
              <td className="font-display font-bold text-navy">{r.overall}</td><td>{r.recommendation && <StatusBadge status={r.recommendation} />}</td><td><StatusBadge status={r.paper_status} /></td><td className="text-slate-500">{fmtDateTime(r.submitted_at)}</td></tr>))}</tbody></TableWrap>)}</Card>)}
      <Modal open={!!open} onClose={() => setOpen(null)} title={open ? `${open.paper_code} — ${open.title}` : ""} size="xl">{open && <ReviewCard review={open} heading="Your review" confidential />}</Modal>
    </>
  );
}
