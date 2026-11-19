import { Review } from "../lib/types";
import { CRITERIA } from "../lib/types";
import { fmtDateTime } from "../lib/format";
import { ScoreBar, StatusBadge } from "./ui";
import { Lock } from "lucide-react";

const Block = ({ t, children }: { t: string; children?: string | null }) => children ? (
  <div><p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">{t}</p><p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{children}</p></div>) : null;

export default function ReviewCard({ review, heading, confidential }: { review: Review; heading?: string; confidential?: boolean }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div><p className="font-display font-semibold text-navy">{heading ?? "Review"}</p>
          <p className="text-xs text-slate-400">Paper v{review.version_no}{review.submitted_at ? ` · submitted ${fmtDateTime(review.submitted_at)}` : " · draft"}</p></div>
        <div className="flex items-center gap-3">
          {review.overall != null && <div className="text-right"><p className="font-display text-2xl font-bold leading-none text-navy">{review.overall}</p><p className="text-[10px] uppercase text-slate-400">avg / 10</p></div>}
          {review.recommendation && <StatusBadge status={review.recommendation === "accept" || review.recommendation === "reject" ? review.recommendation : review.recommendation} />}
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{CRITERIA.map((c) => <ScoreBar key={c.key} label={c.label} value={review[c.key]} />)}</div>
      <div className="mt-5 space-y-4">
        <Block t="Strengths">{review.strengths}</Block><Block t="Weaknesses">{review.weaknesses}</Block><Block t="Detailed comments">{review.comments}</Block>
        {confidential && review.confidential_comments && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3"><p className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase text-amber-700"><Lock className="h-3.5 w-3.5" />Confidential — admin only</p>
            <p className="whitespace-pre-wrap text-sm text-amber-900">{review.confidential_comments}</p></div>)}
      </div>
    </div>
  );
}
