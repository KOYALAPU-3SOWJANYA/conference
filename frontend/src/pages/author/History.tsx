import { FileUp, Gavel } from "lucide-react";
import { Link } from "react-router-dom";
import { Card, Empty, ErrorBox, PageHeader, PageLoader } from "../../components/ui";
import { fmtDateTime } from "../../lib/format";
import { useFetch } from "../../lib/hooks";

interface Ev { type: "version" | "decision"; paper_id: number; paper_code: string; title: string; label: string; detail?: string | null; at: string }

export default function AuthorHistory() {
  const { data, error, loading, reload } = useFetch<Ev[]>("/author/history", { poll: 10000 });
  return (
    <>
      <PageHeader title="Submission History" subtitle="A timeline of every upload and decision across your papers" />
      {error && <ErrorBox message={error} retry={reload} />}
      {loading && !data ? <PageLoader /> : !data?.length ? <Card><Empty title="Nothing here yet" text="Your submissions and decisions will be listed here." /></Card> : (
        <div className="relative ml-4 border-l-2 border-blue-100 pl-8">{data.map((e, i) => (
          <div key={i} className="relative mb-5 animate-fadeUp">
            <span className={`absolute -left-[50px] top-3 grid h-9 w-9 place-items-center rounded-xl text-white shadow ${e.type === "decision" ? "bg-gradient-to-br from-emerald-500 to-teal-400" : "bg-gradient-to-br from-royal to-electric"}`}>{e.type === "decision" ? <Gavel className="h-4 w-4" /> : <FileUp className="h-4 w-4" />}</span>
            <Card className="p-4"><div className="flex flex-wrap items-center justify-between gap-2"><Link to={`/author/papers/${e.paper_id}`} className="font-semibold text-navy hover:text-royal">{e.label}</Link><span className="text-xs text-slate-400">{fmtDateTime(e.at)}</span></div>
              <p className="text-sm text-slate-500"><b className="text-royal">{e.paper_code}</b> · {e.title}</p>{e.detail && <p className="mt-1 text-xs italic text-slate-400">“{e.detail}”</p>}</Card></div>))}</div>)}
    </>
  );
}
